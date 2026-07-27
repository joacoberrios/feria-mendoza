"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { resolveWithoutRefund, resolveWithRefund, retryRefund } from "./actions";

type Props = {
  disputeId: number;
  orderId: number;
  amount: number;
  status: string;
};

export function ResolveForm({ disputeId, orderId, amount, status }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (status === "refunded" || status === "resolved") return null;

  if (status === "refund_failed") {
    return (
      <form action={retryRefund} className="mt-3">
        <input type="hidden" name="dispute_id" value={disputeId} />
        <input type="hidden" name="order_id" value={orderId} />
        <ConfirmButton
          confirmMessage={`¿Reintentar el reembolso de $${amount.toLocaleString("es-AR")} al comprador? Verificá antes que el vendedor tenga fondos en Mercado Pago.`}
          variant="secondary"
          size="sm"
        >
          Reintentar reembolso
        </ConfirmButton>
      </form>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 text-sm text-azul-deep underline hover:no-underline"
      >
        Resolver disputa
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-bg-subtle p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`notes-${disputeId}`} className="text-xs font-medium text-ink-soft">
          Notas de resolución (visibles solo para admin)
        </label>
        <textarea
          id={`notes-${disputeId}`}
          name="resolution_notes"
          rows={3}
          placeholder="Detalle de la resolución..."
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-azul-deep"
          form={`resolve-form-${disputeId}`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Reembolso — mueve dinero real, requiere confirmación explícita */}
        <form id={`refund-form-${disputeId}`} action={resolveWithRefund}>
          <input type="hidden" name="dispute_id" value={disputeId} />
          <input type="hidden" name="order_id" value={orderId} />
          <ConfirmButton
            confirmMessage={`Esto va a devolver $${amount.toLocaleString("es-AR")} al comprador vía Mercado Pago. Verificá que el vendedor tenga fondos suficientes antes de confirmar.`}
            variant="danger"
            size="sm"
          >
            Reembolsar al comprador
          </ConfirmButton>
        </form>

        {/* Resolución sin reembolso */}
        <form id={`resolve-form-${disputeId}`} action={resolveWithoutRefund}>
          <input type="hidden" name="dispute_id" value={disputeId} />
          <input type="hidden" name="order_id" value={orderId} />
          <ConfirmButton
            confirmMessage="¿Resolver la disputa sin reembolso? El estado de la orden quedará como 'Resuelto'."
            variant="secondary"
            size="sm"
          >
            Resolver sin reembolso
          </ConfirmButton>
        </form>

        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-sm text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
