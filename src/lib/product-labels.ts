import type { ProductCondition, ProductStatus } from "@/types/database";
import type { ChipTone } from "@/components/ui/Chip";

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  como_nuevo: "Como nuevo",
  usado: "Usado",
};

// Tono de chip/badge por condición — reusado en la tarjeta de producto,
// el filtro y el detalle, para que signifiquen lo mismo en toda la app.
export const CONDITION_TONES: Record<ProductCondition, ChipTone> = {
  nuevo: "menta",
  como_nuevo: "lav",
  usado: "ciruela",
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Borrador",
  pending_payment: "Pendiente de pago",
  active: "Activo",
  paused: "Pausado",
  sold: "Vendido",
  removed: "Eliminado",
};
