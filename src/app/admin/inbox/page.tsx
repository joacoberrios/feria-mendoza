import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { CLASSIFICATION_LABELS, CLASSIFICATION_TONES } from "@/lib/inbox/classification-labels";
import { FilterChipGroup } from "@/components/ui/Chip";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InboxCard, type InboxCardData } from "@/components/admin/InboxCard";
import { WhatsAppInboxCard, type WhatsAppInboxCardData } from "@/components/admin/WhatsAppInboxCard";
import { BackfillButton } from "@/components/admin/BackfillButton";
import type {
  SocialClassification,
  SocialContact,
  SocialConversation,
  SocialMessage,
  ReplyDraft,
} from "@/types/database";

type ConversationRow = SocialConversation & {
  social_contacts: SocialContact | null;
  social_messages: SocialMessage[];
  reply_drafts: ReplyDraft[];
};

const ACTIVE_STATUSES = ["pending", "replied"] as const;

type InboxSearchParams = {
  platform?: string;
  classification?: string;
  archived?: string;
  error?: string;
  sent?: string;
  discarded?: string;
  archived_ok?: string;
  regenerated?: string;
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<InboxSearchParams>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const params = await searchParams;
  const platform = params.platform === "whatsapp" ? "whatsapp" : "instagram";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex gap-2">
        <Link
          href="/admin/inbox?platform=instagram"
          className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
            platform === "instagram"
              ? "bg-terracota-deep text-white"
              : "bg-bg-subtle text-ink-soft hover:bg-border"
          }`}
        >
          Instagram
        </Link>
        <Link
          href="/admin/inbox?platform=whatsapp"
          className={`rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
            platform === "whatsapp" ? "bg-malbec text-white" : "bg-bg-subtle text-ink-soft hover:bg-border"
          }`}
        >
          WhatsApp
        </Link>
      </div>

      {params.error && <Alert variant="err">{params.error}</Alert>}
      {params.sent && <Alert variant="ok">Respuesta enviada.</Alert>}
      {params.discarded && <Alert variant="ok">Borrador descartado.</Alert>}
      {params.regenerated && <Alert variant="ok">Borrador regenerado.</Alert>}

      {platform === "whatsapp" ? <WhatsAppView /> : <InstagramView params={params} />}
    </main>
  );
}

async function InstagramView({ params }: { params: InboxSearchParams }) {
  const { classification, archived } = params;
  const showArchived = archived === "1";

  const supabase = await createClient();

  let query = supabase
    .from("social_conversations")
    .select(
      `id, contact_id, platform, kind, ig_media_id, ig_media_caption, status,
       classification, classification_confidence, priority_score, last_inbound_at, created_at,
       social_contacts(id, platform, external_id, username, display_name, interaction_count, first_seen_at, last_seen_at),
       social_messages(id, conversation_id, direction, kind, external_id, text, raw_payload, sent_by, created_at),
       reply_drafts(id, conversation_id, in_reply_to, draft_text, status, model, error_detail, approved_by, approved_at, created_at)`,
    )
    .eq("platform", "instagram")
    .order("priority_score", { ascending: false });

  if (!showArchived) {
    query = query.in("status", ACTIVE_STATUSES);
  }

  const { data: rows } = await query.returns<ConversationRow[]>();
  const allRows = rows ?? [];

  const counts = new Map<SocialClassification, number>();
  for (const row of allRows) {
    counts.set(row.classification, (counts.get(row.classification) ?? 0) + 1);
  }

  const displayedRows = classification
    ? allRows.filter((row) => row.classification === classification)
    : allRows;

  const cards: InboxCardData[] = displayedRows
    .filter((row): row is ConversationRow & { social_contacts: SocialContact } => !!row.social_contacts)
    .map((row) => {
      const inbound = row.social_messages
        .filter((m) => m.direction === "in")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const draft = row.reply_drafts.find((d) => d.status === "suggested") ?? null;
      const alreadySentPrivateReply = row.social_messages.some(
        (m) => m.direction === "out" && m.kind === "private_reply",
      );

      return {
        conversation: row,
        contact: row.social_contacts,
        latestInbound: inbound[0] ?? null,
        draft,
        alreadySentPrivateReply,
      };
    });

  const classificationOptions = (Object.keys(CLASSIFICATION_LABELS) as SocialClassification[]).map((value) => ({
    value,
    label: `${CLASSIFICATION_LABELS[value]} (${counts.get(value) ?? 0})`,
  }));

  return (
    <>
      <h1 className="mb-2 font-display text-xl font-semibold">Bandeja de Instagram</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Los borradores los redacta la IA — nada sale a Instagram sin que los apruebes vos.
      </p>

      <BackfillButton />

      <form method="get" className="mb-8 flex flex-col gap-4">
        <input type="hidden" name="platform" value="instagram" />
        <FilterChipGroup
          name="classification"
          groupLabel="Clasificación"
          options={classificationOptions}
          selectedValue={classification ?? ""}
          toneFor={(value) => (value ? CLASSIFICATION_TONES[value as SocialClassification] : "line")}
        />
        <label className="flex w-fit items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="archived" value="1" defaultChecked={showArchived} />
          Mostrar archivadas / descartadas
        </label>
        <div>
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </div>
      </form>

      {cards.length === 0 && <p className="text-sm text-ink-soft">No hay conversaciones para mostrar.</p>}

      <ul className="flex flex-col gap-4">
        {cards.map((card) => (
          <InboxCard key={card.conversation.id} data={card} />
        ))}
      </ul>
    </>
  );
}

async function WhatsAppView() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("social_conversations")
    .select(
      `id, contact_id, platform, kind, status, classification, classification_confidence,
       priority_score, last_inbound_at, created_at, customer_last_message_at,
       business_last_message_at, free_window_expires_at, follow_up_status,
       social_contacts(id, platform, external_id, username, display_name, interaction_count, first_seen_at, last_seen_at, wa_id, phone_display),
       social_messages(id, conversation_id, direction, kind, external_id, text, raw_payload, sent_by, created_at),
       reply_drafts(id, conversation_id, in_reply_to, draft_text, status, model, error_detail, approved_by, approved_at, created_at)`,
    )
    .eq("platform", "whatsapp")
    .eq("status", "pending")
    .order("priority_score", { ascending: false })
    .returns<ConversationRow[]>();

  const cards: WhatsAppInboxCardData[] = (rows ?? [])
    .filter((row): row is ConversationRow & { social_contacts: SocialContact } => !!row.social_contacts)
    .map((row) => {
      const inbound = row.social_messages
        .filter((m) => m.direction === "in")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const draft = row.reply_drafts.find((d) => d.status === "suggested") ?? null;

      return {
        conversation: row,
        contact: row.social_contacts,
        latestInbound: inbound[0] ?? null,
        draft,
      };
    });

  return (
    <>
      <div className="rounded-2xl bg-malbec p-4 text-[#f8eef4]">
        <div className="flex items-center gap-[7px] font-display text-lg font-bold">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-wa-brand text-[11px]">
            ✆
          </span>
          WhatsApp · Feria Mendoza
        </div>
        <p className="mt-1 text-[11.5px] text-[#d9bfd0]">
          API oficial de Meta · respuestas dentro de la ventana gratuita, siempre con tu aprobación
        </p>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          <span className="rounded-pill bg-white px-3 py-1.5 text-[11.5px] font-semibold text-malbec">
            Sin responder ({cards.length})
          </span>
          <span className="cursor-not-allowed rounded-pill bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-[#e8d5e1]">
            🧊 Seguimientos (próximamente)
          </span>
        </div>
      </div>

      {cards.length === 0 && (
        <p className="mt-6 text-sm text-ink-soft">No hay conversaciones de WhatsApp sin responder.</p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {cards.map((card) => (
          <WhatsAppInboxCard key={card.conversation.id} data={card} />
        ))}
      </ul>

      <p className="mt-4 text-center text-[11px] text-ink-soft">
        🔒 Nada se envía sin tu aprobación · <strong className="text-ink">costo $0</strong> en respuestas dentro
        de ventana
      </p>
    </>
  );
}
