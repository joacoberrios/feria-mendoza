import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { approveWhatsappReply, discardWhatsappDraft } from "@/app/admin/inbox/whatsapp-actions";
import { regenerateDraft } from "@/app/admin/inbox/actions";
import { getWhatsappWindowStatus, formatRelativeTimeEs, getInitials } from "@/lib/whatsapp/display";
import type { SocialClassification, SocialContact, SocialConversation, SocialMessage, ReplyDraft } from "@/types/database";

export type WhatsAppInboxCardData = {
  conversation: SocialConversation;
  contact: SocialContact;
  latestInbound: SocialMessage | null;
  draft: ReplyDraft | null;
};

// Estilo por clasificación — ver whatsapp-inbox-mockup.html (aprobado).
// Los pasteles de badge se dejan como hex directo (mismo criterio que
// Chip.tsx): son un one-off de este mockup, no ameritan un token
// compartido.
const CLASSIFICATION_STYLE: Record<
  SocialClassification,
  { border: string; avatarBg: string; badgeBg: string; badgeText: string; label: string }
> = {
  vendedor_potencial: {
    border: "border-l-uva",
    avatarBg: "bg-uva",
    badgeBg: "bg-[#f3e4ef]",
    badgeText: "text-[#7c2f63]",
    label: "Vendedor",
  },
  comprador_interesado: {
    border: "border-l-vid",
    avatarBg: "bg-vid",
    badgeBg: "bg-[#e2efe5]",
    badgeText: "text-vid-deep",
    label: "Comprador",
  },
  consulta_general: {
    border: "border-l-[#4a76b8]",
    avatarBg: "bg-[#4a76b8]",
    badgeBg: "bg-[#e3ebf5]",
    badgeText: "text-[#2c5282]",
    label: "Consulta",
  },
  ruido: {
    border: "border-l-border",
    avatarBg: "bg-ink-soft",
    badgeBg: "bg-bg-subtle",
    badgeText: "text-ink-soft",
    label: "Ruido",
  },
  spam: {
    border: "border-l-carmin",
    avatarBg: "bg-carmin",
    badgeBg: "bg-[#f6e2e2]",
    badgeText: "text-carmin",
    label: "Spam",
  },
  sin_clasificar: {
    border: "border-l-border",
    avatarBg: "bg-ink-soft",
    badgeBg: "bg-bg-subtle",
    badgeText: "text-ink-soft",
    label: "Sin clasificar",
  },
};

export function WhatsAppInboxCard({ data }: { data: WhatsAppInboxCardData }) {
  const { conversation, contact, latestInbound, draft } = data;
  const style = CLASSIFICATION_STYLE[conversation.classification];
  const contactLabel = contact.display_name || contact.phone_display || contact.wa_id || "Contacto";
  const initials = getInitials(contact.display_name, contact.phone_display ?? contact.wa_id ?? "??");
  const window = getWhatsappWindowStatus(conversation.free_window_expires_at);
  const windowBlocked = window.tone === "expired";

  return (
    <li className={`rounded-[13px] border border-border bg-white p-[13px] shadow-sm border-l-4 ${style.border}`}>
      <div className="flex flex-wrap items-center gap-[9px]">
        <div
          className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12px] font-bold text-white ${style.avatarBg}`}
        >
          {initials}
        </div>
        <div className="text-[13px] font-semibold text-ink">
          {contactLabel}{" "}
          <span className="text-[10.5px] font-normal text-ink-soft">
            · {formatRelativeTimeEs(conversation.last_inbound_at)}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-[5px]">
          <span
            className={`rounded-pill px-2 py-[3px] text-[9.5px] font-bold tracking-[.03em] whitespace-nowrap ${style.badgeBg} ${style.badgeText}`}
          >
            {style.label}
            {conversation.classification_confidence != null &&
              ` · ${Math.round(conversation.classification_confidence * 100)}%`}
          </span>
        </div>
      </div>

      <div className="mt-[9px] rounded-[9px] bg-bg px-[11px] py-[9px] text-[13px] leading-[1.45] text-ink">
        {latestInbound?.text ?? <span className="text-ink-soft italic">(sin texto)</span>}
      </div>

      <span
        className={`mt-1.5 inline-flex items-center gap-1 rounded-pill px-2 py-[3px] text-[10px] font-bold ${
          windowBlocked ? "bg-[#fde8e0] text-[#a13f1f]" : "bg-[#e2efe5] text-vid-deep"
        }`}
      >
        {windowBlocked ? "⚠" : "✓"} {window.label}
      </span>

      {draft ? (
        <form className="mt-[9px] flex flex-col gap-2">
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <input type="hidden" name="draft_id" value={draft.id} />
          <input type="hidden" name="wa_id" value={contact.wa_id ?? contact.external_id} />

          <div className="rounded-[10px] border-[1.5px] border-dashed border-[#d9b8ce] bg-[#f7edf4] px-[11px] py-[9px]">
            <label
              htmlFor={`draft-${draft.id}`}
              className="mb-[5px] flex items-center gap-[5px] text-[9.5px] font-bold tracking-[.08em] text-uva uppercase"
            >
              ✨ Borrador IA
            </label>
            <textarea
              id={`draft-${draft.id}`}
              name="draft_text"
              defaultValue={draft.draft_text ?? ""}
              rows={3}
              required
              disabled={windowBlocked}
              className="w-full resize-y rounded-md border-none bg-white/70 px-2 py-1.5 text-[13px] leading-[1.5] text-[#4a2440] outline-none focus:bg-white focus:shadow-[inset_0_0_0_2px_var(--color-uva)] disabled:opacity-60"
            />
          </div>

          {draft.status === "send_failed" && draft.error_detail && draft.error_detail !== "free_window_expired" && (
            <p className="text-xs font-medium text-carmin">Falló el envío anterior: {draft.error_detail}</p>
          )}

          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {windowBlocked ? (
              <p className="text-xs text-ink-soft">
                Fuera de ventana — todavía no hay envío por plantilla (llega en una próxima etapa). Podés
                descartar este borrador.
              </p>
            ) : (
              <>
                <Button type="submit" formAction={approveWhatsappReply} variant="secondary" size="sm">
                  ✓ Aprobar y enviar
                </Button>
                <Button type="submit" formAction={regenerateDraft} variant="ghost" size="sm">
                  Regenerar
                </Button>
              </>
            )}
            <ConfirmButton
              type="submit"
              formAction={discardWhatsappDraft}
              confirmMessage={`¿Descartar el borrador para ${contactLabel}? No se va a enviar nada.`}
              size="sm"
            >
              ✕ Descartar
            </ConfirmButton>
          </div>
        </form>
      ) : (
        <form className="mt-[9px] flex flex-wrap gap-1.5">
          <input type="hidden" name="conversation_id" value={conversation.id} />
          <p className="w-full text-xs text-ink-soft">
            La IA no generó un borrador para este mensaje ({style.label.toLowerCase()}).
          </p>
          <Button type="submit" formAction={regenerateDraft} variant="ghost" size="sm">
            Regenerar
          </Button>
        </form>
      )}
    </li>
  );
}
