import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Textarea } from "@/components/ui/Textarea";
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_TONES,
  CONVERSATION_STATUS_LABELS,
} from "@/lib/inbox/classification-labels";
import { getDmWindowStatus, getCommentPrivateReplyWindow } from "@/lib/inbox/reply-window";
import { approveAndSend, regenerateDraft, discardDraft, archiveConversation } from "@/app/admin/inbox/actions";
import type {
  SocialContact,
  SocialConversation,
  SocialMessage,
  ReplyDraft,
} from "@/types/database";

export type InboxCardData = {
  conversation: SocialConversation;
  contact: SocialContact;
  latestInbound: SocialMessage | null;
  draft: ReplyDraft | null;
  alreadySentPrivateReply: boolean;
};

function ResponseWindowBadge({ conversation }: { conversation: SocialConversation }) {
  if (conversation.kind === "dm") {
    const window = getDmWindowStatus(conversation.last_inbound_at);
    if (window.kind === "free") {
      return (
        <Chip tone="menta">
          Quedan {Math.max(0, Math.round(window.hoursRemaining))}h para responder gratis
        </Chip>
      );
    }
    if (window.kind === "human_agent_tag") {
      return (
        <Chip tone="terra">
          Fuera de las 24h — se envía con etiqueta de agente humano ({Math.round(window.hoursRemaining)}h restantes de 7 días)
        </Chip>
      );
    }
    return <Chip tone="carmin">Ventana de 7 días vencida — solo se puede archivar</Chip>;
  }

  const privateWindow = getCommentPrivateReplyWindow(conversation.last_inbound_at);
  return privateWindow.available ? (
    <Chip tone="menta">Respuesta privada disponible ({Math.round(privateWindow.hoursRemaining / 24)}d restantes)</Chip>
  ) : (
    <Chip tone="line">Ventana de respuesta privada vencida — solo respuesta pública</Chip>
  );
}

export function InboxCard({ data }: { data: InboxCardData }) {
  const { conversation, contact, latestInbound, draft, alreadySentPrivateReply } = data;
  const isResolved = conversation.status === "replied" || conversation.status === "archived" || conversation.status === "discarded";
  const contactLabel = contact.display_name || contact.username || `IGSID ${contact.external_id}`;

  // Solo los DM tienen un "punto sin retorno": pasados los 7 días,
  // Instagram ya no deja mandar nada y la única acción posible es
  // archivar. Los comentarios siempre pueden responderse público, así
  // que para ellos esto queda en false (el radio "privado" se
  // deshabilita aparte, vía privateReplyAvailable).
  const sendBlocked = conversation.kind === "dm" && getDmWindowStatus(conversation.last_inbound_at).kind === "expired";
  const privateReplyAvailable =
    conversation.kind === "comment" &&
    !alreadySentPrivateReply &&
    getCommentPrivateReplyWindow(conversation.last_inbound_at).available;

  return (
    <li className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ink">{contactLabel}</span>
        {contact.interaction_count >= 3 && <Chip tone="ciruela">Recurrente</Chip>}
        <span className="text-xs text-ink-soft">
          {contact.interaction_count} interacción{contact.interaction_count === 1 ? "" : "es"}
        </span>
        <Chip tone={CLASSIFICATION_TONES[conversation.classification]}>
          {CLASSIFICATION_LABELS[conversation.classification]}
          {conversation.classification_confidence != null &&
            ` · ${Math.round(conversation.classification_confidence * 100)}%`}
        </Chip>
        {isResolved && <Chip tone="line">{CONVERSATION_STATUS_LABELS[conversation.status]}</Chip>}
      </div>

      <p className="mt-2 text-xs font-medium text-ink-soft uppercase tracking-wide">
        {conversation.kind === "dm" ? "DM" : "Comentario"}
      </p>

      {conversation.kind === "comment" && conversation.ig_media_caption && (
        <p className="mt-1 rounded-md bg-bg-subtle px-3 py-2 text-xs text-ink-soft">
          Caption de la publicación: &ldquo;{conversation.ig_media_caption}&rdquo;
        </p>
      )}

      <p className="mt-2 text-sm text-ink">
        {latestInbound?.text ?? <span className="text-ink-soft italic">(sin texto)</span>}
      </p>

      {!isResolved && (
        <div className="mt-2">
          <ResponseWindowBadge conversation={conversation} />
        </div>
      )}

      {isResolved ? (
        <p className="mt-3 text-sm text-ink-soft">
          {conversation.status === "replied" && "Ya se respondió esta conversación."}
          {conversation.status === "archived" && "Archivada — no requiere acción."}
          {conversation.status === "discarded" && "Descartada por un admin."}
        </p>
      ) : draft ? (
        <form className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <input type="hidden" name="draft_id" value={draft.id} />
          <input type="hidden" name="contact_external_id" value={contact.external_id} />
          <input type="hidden" name="comment_external_id" value={latestInbound?.external_id ?? ""} />
          <input type="hidden" name="last_inbound_at" value={conversation.last_inbound_at ?? ""} />

          {conversation.kind === "dm" && <input type="hidden" name="reply_mode" value="dm" />}

          {conversation.kind === "comment" && !sendBlocked && (
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-1 text-xs font-semibold text-ink">Responder</legend>
              <div className="flex gap-4 text-sm text-ink-soft">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="reply_mode"
                    value="private_reply"
                    defaultChecked={privateReplyAvailable}
                    disabled={!privateReplyAvailable}
                  />
                  Privado
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="reply_mode" value="public_reply" defaultChecked={!privateReplyAvailable} />
                  Público
                </label>
              </div>
            </fieldset>
          )}

          {!sendBlocked && (
            <Textarea
              name="draft_text"
              label="Borrador IA — se envía solo si lo aprobás"
              defaultValue={draft.draft_text ?? ""}
              rows={3}
              required
            />
          )}

          {draft.status === "send_failed" && draft.error_detail && (
            <p className="text-xs font-medium text-carmin">Falló el envío anterior: {draft.error_detail}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {sendBlocked ? (
              <Button type="submit" formAction={archiveConversation} variant="secondary" size="sm">
                Archivar
              </Button>
            ) : (
              <>
                <Button type="submit" formAction={approveAndSend} size="sm">
                  Aprobar y enviar
                </Button>
                <Button type="submit" formAction={regenerateDraft} variant="ghost" size="sm">
                  Regenerar
                </Button>
                <ConfirmButton
                  type="submit"
                  formAction={discardDraft}
                  confirmMessage={`¿Descartar el borrador para ${contactLabel}? No se va a enviar nada.`}
                  size="sm"
                >
                  Descartar
                </ConfirmButton>
              </>
            )}
          </div>
        </form>
      ) : (
        <form className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <p className="w-full text-sm text-ink-soft">
            La IA no generó un borrador para este mensaje (clasificación: {CLASSIFICATION_LABELS[conversation.classification]}).
          </p>
          <Button type="submit" formAction={regenerateDraft} variant="ghost" size="sm">
            Regenerar
          </Button>
          <Button type="submit" formAction={archiveConversation} variant="secondary" size="sm">
            Archivar
          </Button>
        </form>
      )}
    </li>
  );
}
