import type { SocialClassification, SocialConversationStatus } from "@/types/database";
import type { ChipTone } from "@/components/ui/Chip";

export const CLASSIFICATION_LABELS: Record<SocialClassification, string> = {
  vendedor_potencial: "Vendedor potencial",
  comprador_interesado: "Comprador interesado",
  consulta_general: "Consulta general",
  ruido: "Ruido",
  spam: "Spam",
  sin_clasificar: "Sin clasificar",
};

export const CLASSIFICATION_TONES: Record<SocialClassification, ChipTone> = {
  vendedor_potencial: "menta",
  comprador_interesado: "azul",
  consulta_general: "terra",
  ruido: "line",
  spam: "carmin",
  sin_clasificar: "lav",
};

export const CONVERSATION_STATUS_LABELS: Record<SocialConversationStatus, string> = {
  pending: "Pendiente",
  replied: "Respondida",
  archived: "Archivada",
  discarded: "Descartada",
};
