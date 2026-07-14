// Helpers de presentación puros (sin DB/red) para la pestaña de
// WhatsApp de /admin/inbox — separados de reply-window.ts porque ese
// archivo tiene la lógica de VALIDACIÓN server-side (Instagram), esto
// es solo formato de texto para la UI.

export type WhatsappWindowStatus = { tone: "free" | "expired"; label: string };

export function getWhatsappWindowStatus(freeWindowExpiresAt: string | null): WhatsappWindowStatus {
  if (!freeWindowExpiresAt) {
    return { tone: "expired", label: "Ventana desconocida — requiere plantilla aprobada" };
  }

  const msRemaining = new Date(freeWindowExpiresAt).getTime() - Date.now();
  if (msRemaining <= 0) {
    return { tone: "expired", label: "Fuera de ventana · requiere plantilla aprobada" };
  }

  const hoursRemaining = msRemaining / 3_600_000;
  const remainingLabel =
    hoursRemaining < 1 ? `${Math.max(1, Math.round(msRemaining / 60_000))} min` : `${Math.round(hoursRemaining)}h`;

  return { tone: "free", label: `Dentro de ventana · quedan ${remainingLabel}` };
}

export function formatRelativeTimeEs(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}

export function getInitials(name: string | null, fallbackDigits: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return fallbackDigits.slice(-2).toUpperCase();
}
