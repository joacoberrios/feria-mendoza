"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { openDispute } from "./actions";

const REASONS: { value: string; label: string }[] = [
  { value: "no_llego", label: "No llegó" },
  { value: "no_es_lo_comprado", label: "No es lo que compré" },
  { value: "llego_daniado", label: "Llegó dañado" },
  { value: "otro", label: "Otro" },
];

export function DisputeForm({ orderId }: { orderId: number }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-carmin underline hover:no-underline"
      >
        Reportar un problema
      </button>
    );
  }

  return (
    <form action={openDispute} className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-bg-subtle p-4">
      <input type="hidden" name="order_id" value={orderId} />
      <p className="text-sm font-semibold text-ink">¿Cuál es el problema?</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Motivo de la disputa</legend>
        {REASONS.map((r) => (
          <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input type="radio" name="reason" value={r.value} required className="accent-terracota-deep" />
            {r.label}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={`comment-${orderId}`} className="text-xs font-medium text-ink-soft">
          Comentario adicional (opcional)
        </label>
        <textarea
          id={`comment-${orderId}`}
          name="comment"
          rows={3}
          placeholder="Contanos más detalles..."
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-azul-deep"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="danger">
          Enviar reporte
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
