"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

// Modal de confirmación accesible: foco atrapado, Esc cierra, foco
// vuelve al trigger al cerrar. Para acciones destructivas con dinero
// real — no reemplaza window.confirm en acciones de bajo riesgo.
export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Mueve el foco al botón cancelar cuando el modal se abre.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Cierra con Esc y atrapa el foco dentro del panel.
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2
          id="confirm-modal-title"
          className="font-display text-base font-semibold text-ink"
        >
          {title}
        </h2>

        <div className="mt-2 text-sm text-ink-soft">{children}</div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-pill border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-bg-subtle focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-malbec focus-visible:outline-offset-2"
          >
            Cancelar
          </button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
