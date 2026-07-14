import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SocialClassification,
  SocialConversation,
  SocialConversationKind,
  SocialMessage,
} from "@/types/database";
import { buildClassifySystemPrompt, buildClassifyUserMessage } from "./prompts";
import { getMediaCaption } from "./instagram-api";
import { getFeaturedStoriesPlanDescription } from "./business-context";

const PLATFORM_LABELS: Record<SocialConversation["platform"], string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

type AdminClient = SupabaseClient;

const MODEL = "claude-haiku-4-5-20251001";
const THREAD_HISTORY_LIMIT = 5;

const CLASSIFICATIONS: readonly SocialClassification[] = [
  "vendedor_potencial",
  "comprador_interesado",
  "consulta_general",
  "ruido",
  "spam",
  "sin_clasificar",
];

const NO_DRAFT_CLASSIFICATIONS: readonly SocialClassification[] = ["ruido", "spam"];

function isValidClassification(value: unknown): value is SocialClassification {
  return typeof value === "string" && (CLASSIFICATIONS as readonly string[]).includes(value);
}

const CLASSIFY_TOOL = {
  name: "classify_message",
  description: "Clasifica el mensaje entrante de Instagram y sugiere un borrador de respuesta.",
  input_schema: {
    type: "object",
    properties: {
      classification: {
        type: "string",
        enum: CLASSIFICATIONS,
        description: "Una de las 6 categorías definidas en el system prompt.",
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Confianza de 0 a 1 en la clasificación elegida.",
      },
      draft: {
        type: ["string", "null"],
        description: "Borrador de respuesta en español rioplatense, o null si no corresponde.",
      },
    },
    required: ["classification", "confidence", "draft"],
  },
} satisfies Anthropic.Tool;

type ClassifyToolOutput = {
  classification: SocialClassification;
  confidence: number;
  draft: string | null;
};

function parseToolOutput(raw: unknown): ClassifyToolOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (!isValidClassification(obj.classification)) return null;

  const confidenceRaw = typeof obj.confidence === "number" ? obj.confidence : 0;
  const confidence = Math.min(1, Math.max(0, confidenceRaw));

  const draft = typeof obj.draft === "string" && obj.draft.trim() ? obj.draft.trim() : null;

  return { classification: obj.classification, confidence, draft };
}

function priorityBase(classification: SocialClassification): number {
  if (classification === "vendedor_potencial") return 100;
  if (classification === "comprador_interesado") return 70;
  if (classification === "consulta_general") return 40;
  return 0;
}

// La bonificación de urgencia es una foto del momento de clasificar, no
// se recalcula sola con el paso del tiempo (no hay cron para eso) — la
// UI muestra el tiempo restante real de la ventana aparte, en vivo.
export function computePriorityScore(params: {
  classification: SocialClassification;
  interactionCount: number;
  kind: SocialConversationKind;
  lastInboundAt: string | null;
}): number {
  const base = priorityBase(params.classification);
  const interactionBonus = Math.min(params.interactionCount, 5) * 5;

  let urgencyBonus = 0;
  if (params.kind === "dm" && params.lastInboundAt) {
    const hoursElapsed = (Date.now() - new Date(params.lastInboundAt).getTime()) / 3_600_000;
    const hoursRemaining = 24 - hoursElapsed;
    if (hoursRemaining > 0 && hoursRemaining < 6) urgencyBonus = 20;
  }

  return base + interactionBonus + urgencyBonus;
}

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

async function fetchThreadHistory(
  admin: AdminClient,
  conversationId: number,
): Promise<{ direction: "in" | "out"; text: string | null }[]> {
  const { data } = await admin
    .from("social_messages")
    .select("direction, text, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(THREAD_HISTORY_LIMIT)
    .returns<Pick<SocialMessage, "direction" | "text" | "created_at">[]>();

  return (data ?? []).reverse().map((m) => ({ direction: m.direction, text: m.text }));
}

// Se llama después de insertar un mensaje entrante nuevo (webhook o
// backfill) y también desde la acción "Regenerar" de la bandeja. Nunca
// tira: si algo falla, la conversación queda 'sin_clasificar'/'pending'
// y el mensaje ya insertado no se pierde (eso lo garantiza el caller,
// que inserta el mensaje ANTES de llamar acá).
export async function classifyAndDraft(
  admin: AdminClient,
  conversationId: number,
  messageId: number,
): Promise<void> {
  const { data: conversation } = await admin
    .from("social_conversations")
    .select("*")
    .eq("id", conversationId)
    .single<SocialConversation>();

  if (!conversation) {
    console.error("[inbox:classify] conversación no encontrada:", conversationId);
    return;
  }

  const { data: message } = await admin
    .from("social_messages")
    .select("*")
    .eq("id", messageId)
    .single<SocialMessage>();

  if (!message) {
    console.error("[inbox:classify] mensaje no encontrado:", messageId);
    return;
  }

  try {
    const { data: contact } = await admin
      .from("social_contacts")
      .select("interaction_count")
      .eq("id", conversation.contact_id)
      .single<{ interaction_count: number }>();

    let mediaCaption = conversation.ig_media_caption;
    if (conversation.kind === "comment" && !mediaCaption && conversation.ig_media_id) {
      mediaCaption = await getMediaCaption(admin, conversation.ig_media_id);
      if (mediaCaption) {
        await admin
          .from("social_conversations")
          .update({ ig_media_caption: mediaCaption })
          .eq("id", conversation.id);
      }
    }

    const threadHistory = await fetchThreadHistory(admin, conversationId);
    const platformLabel = PLATFORM_LABELS[conversation.platform];

    const userMessage = buildClassifyUserMessage({
      messageText: message.text ?? "",
      kind: conversation.kind,
      platformLabel,
      mediaCaption,
      interactionCount: contact?.interaction_count ?? 0,
      threadHistory,
    });

    const planDescription = await getFeaturedStoriesPlanDescription(admin);
    const systemPrompt = buildClassifySystemPrompt({ platformLabel, planDescription });

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: "tool", name: "classify_message" },
    });

    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    const parsed = parseToolOutput(toolUseBlock?.input);

    if (!parsed) {
      console.error("[inbox:classify] respuesta del modelo no tiene el formato esperado:", response.content);
      await markUnclassified(admin, conversation, contact?.interaction_count ?? 0);
      return;
    }

    await applyClassification(admin, conversation, message, contact?.interaction_count ?? 0, parsed);
  } catch (err) {
    console.error("[inbox:classify] error clasificando mensaje", messageId, err);
    const { data: contact } = await admin
      .from("social_contacts")
      .select("interaction_count")
      .eq("id", conversation.contact_id)
      .single<{ interaction_count: number }>();
    await markUnclassified(admin, conversation, contact?.interaction_count ?? 0);
  }
}

async function markUnclassified(
  admin: AdminClient,
  conversation: SocialConversation,
  interactionCount: number,
): Promise<void> {
  const priorityScore = computePriorityScore({
    classification: "sin_clasificar",
    interactionCount,
    kind: conversation.kind,
    lastInboundAt: conversation.last_inbound_at,
  });

  await admin
    .from("social_conversations")
    .update({
      classification: "sin_clasificar",
      classification_confidence: null,
      priority_score: priorityScore,
    })
    .eq("id", conversation.id);
}

async function applyClassification(
  admin: AdminClient,
  conversation: SocialConversation,
  message: SocialMessage,
  interactionCount: number,
  parsed: ClassifyToolOutput,
): Promise<void> {
  const priorityScore = computePriorityScore({
    classification: parsed.classification,
    interactionCount,
    kind: conversation.kind,
    lastInboundAt: conversation.last_inbound_at,
  });

  const isNoise = NO_DRAFT_CLASSIFICATIONS.includes(parsed.classification);

  await admin
    .from("social_conversations")
    .update({
      classification: parsed.classification,
      classification_confidence: parsed.confidence,
      priority_score: priorityScore,
      status: isNoise ? "archived" : conversation.status,
    })
    .eq("id", conversation.id);

  if (isNoise || !parsed.draft) return;

  // "Regenerar" reusa esta misma función — si ya había un borrador
  // 'suggested' para esta conversación, lo pisa en vez de acumular
  // filas viejas.
  const { data: existingDraft } = await admin
    .from("reply_drafts")
    .select("id")
    .eq("conversation_id", conversation.id)
    .eq("status", "suggested")
    .maybeSingle<{ id: number }>();

  if (existingDraft) {
    await admin
      .from("reply_drafts")
      .update({
        in_reply_to: message.id,
        draft_text: parsed.draft,
        model: MODEL,
        error_detail: null,
      })
      .eq("id", existingDraft.id);
  } else {
    await admin.from("reply_drafts").insert({
      conversation_id: conversation.id,
      in_reply_to: message.id,
      draft_text: parsed.draft,
      status: "suggested",
      model: MODEL,
    });
  }
}
