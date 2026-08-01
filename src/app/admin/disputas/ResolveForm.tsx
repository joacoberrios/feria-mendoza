"use client";

import { useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { resolveWithoutRefund, resolveWithRefund, retryRefund } from "./actions";

type Props = {
  disputeId: number;
  orderId: number;
  amount: number;
  status: string;
};

export function ResolveForm({ disputeId, orderId, amount, status }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const refundTriggerRef = useRef<HTMLButtonElement>(null);
  const retryTriggerRef = useRef<HTMLButtonElement>(null);
  const refundFormRef = useRef<HTMLFormElement>(null);
  const retryFormRef = useRef<HTMLFormElement>(null);

  function openModal() {
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    // Devuelve el foco al botón que abrió el modal.
    refundTriggerRef.current?.focus();
  }

  function closeRetryModal() {
    setModalOpen(false);
    retryTriggerRef.current?.focus();
  }

  if (status === "refunded" || status === "resolved") return null;

  if (status === "refund_failed") {
    return (
      <>
        <form ref={retryFormRef} action={retryRefund} className="mt-3">
          <input type="hidden" name="dispute_id" value={disputeId} />
          <input type="hidden" name="order_id" value={orderId} />
          <button
            ref={retryTriggerRef}
            type="button"
            onClick={openModal}
            className={buttonClasses("secondary", "sm", "")}
          >
            Reintentar reembolso
          </button>
        </form>

        <ConfirmModal
          open={modalOpen}
          title="Reintentar reembolso"
          confirmLabel="Reintentar"
          confirmVariant="secondary"
          onCancel={closeRetryModal}
          onConfirm={() => {
            setModalOpen(false);
            retryFormRef.current?.requestSubmit();
          }}
        >
          <p>
            Vas a devolver{" "}
            <strong>${amount.toLocaleString("es-AR")}</strong> al comprador vía
            Mercado Pago.
          </p>
          <p className="mt-1">
            Verificá que el vendedor tenga fondos suficientes en su cuenta antes de confirmar.
          </p>
        </ConfirmModal>
      </>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 text-sm text-malbec underline hover:no-underline"
      >
        Resolver disputa
      </button>
    );
  }

  return (
    <>
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
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-malbec"
            form={`resolve-form-${disputeId}`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Reembolso — abre modal propio, no window.confirm */}
          <form ref={refundFormRef} action={resolveWithRefund}>
            <input type="hidden" name="dispute_id" value={disputeId} />
            <input type="hidden" name="order_id" value={orderId} />
            <button
              ref={refundTriggerRef}
              type="button"
              onClick={openModal}
              className={buttonClasses("danger", "sm", "")}
            >
              Reembolsar al comprador
            </button>
          </form>

          {/* Resolver sin reembolso — window.confirm es suficiente acá */}
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

      <ConfirmModal
        open={modalOpen}
        title="Reembolsar al comprador"
        confirmLabel="Confirmar reembolso"
        confirmVariant="danger"
        onCancel={closeModal}
        onConfirm={() => {
          setModalOpen(false);
          refundFormRef.current?.requestSubmit();
        }}
      >
        <p>
          Esto va a devolver{" "}
          <strong>${amount.toLocaleString("es-AR")}</strong> al comprador vía
          Mercado Pago. Esta acción no se puede deshacer.
        </p>
        <p className="mt-1">
          Verificá que el vendedor tenga fondos suficientes en su cuenta antes de confirmar.
        </p>
      </ConfirmModal>
    </>
  );
}
