// Ventanas de tiempo de la Messaging Platform de Meta — compartido entre
// la acción de envío (actions.ts) y la UI (para mostrar el indicador),
// así el número mágico de horas vive en un solo lugar.

export const DM_FREE_WINDOW_HOURS = 24;
export const HUMAN_AGENT_WINDOW_HOURS = 24 * 7;

export type DmWindowStatus =
  | { kind: "free"; hoursRemaining: number }
  | { kind: "human_agent_tag"; hoursRemaining: number }
  | { kind: "expired" };

// < 24h del último mensaje del contacto: se puede responder normal.
// Entre 24h y 7 días: hay que mandar tag: HUMAN_AGENT.
// > 7 días: Instagram ya no deja responder ese DM, solo queda archivar.
export function getDmWindowStatus(lastInboundAt: string | null): DmWindowStatus {
  if (!lastInboundAt) return { kind: "expired" };
  const hoursElapsed = (Date.now() - new Date(lastInboundAt).getTime()) / 3_600_000;

  if (hoursElapsed <= DM_FREE_WINDOW_HOURS) {
    return { kind: "free", hoursRemaining: DM_FREE_WINDOW_HOURS - hoursElapsed };
  }
  if (hoursElapsed <= HUMAN_AGENT_WINDOW_HOURS) {
    return { kind: "human_agent_tag", hoursRemaining: HUMAN_AGENT_WINDOW_HOURS - hoursElapsed };
  }
  return { kind: "expired" };
}

// La respuesta privada a un comentario solo está disponible dentro de
// los 7 días del comentario, y una sola vez (eso lo controla el caller
// revisando si ya existe un mensaje saliente kind='private_reply').
export function getCommentPrivateReplyWindow(lastInboundAt: string | null): {
  available: boolean;
  hoursRemaining: number;
} {
  if (!lastInboundAt) return { available: false, hoursRemaining: 0 };
  const hoursElapsed = (Date.now() - new Date(lastInboundAt).getTime()) / 3_600_000;
  const hoursRemaining = HUMAN_AGENT_WINDOW_HOURS - hoursElapsed;
  return { available: hoursRemaining > 0, hoursRemaining };
}
