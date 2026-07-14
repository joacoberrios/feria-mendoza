import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { CLASSIFICATION_LABELS, CLASSIFICATION_TONES } from "@/lib/inbox/classification-labels";
import { FilterChipGroup } from "@/components/ui/Chip";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InboxCard, type InboxCardData } from "@/components/admin/InboxCard";
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

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    classification?: string;
    archived?: string;
    error?: string;
    sent?: string;
    discarded?: string;
    archived_ok?: string;
    regenerated?: string;
  }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const { classification, archived, error, sent, discarded, regenerated } = await searchParams;
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
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 font-display text-xl font-semibold">Bandeja de Instagram</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Los borradores los redacta la IA — nada sale a Instagram sin que los apruebes vos.
      </p>

      {error && <Alert variant="err">{error}</Alert>}
      {sent && <Alert variant="ok">Respuesta enviada.</Alert>}
      {discarded && <Alert variant="ok">Borrador descartado.</Alert>}
      {regenerated && <Alert variant="ok">Borrador regenerado.</Alert>}

      <BackfillButton />

      <form method="get" className="mb-8 flex flex-col gap-4">
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
    </main>
  );
}
