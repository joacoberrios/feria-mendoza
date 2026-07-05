import type { ProductCondition, ProductStatus } from "@/types/database";

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  nuevo: "Nuevo",
  como_nuevo: "Como nuevo",
  usado: "Usado",
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Borrador",
  pending_payment: "Pendiente de pago",
  active: "Activo",
  paused: "Pausado",
  sold: "Vendido",
  removed: "Eliminado",
};
