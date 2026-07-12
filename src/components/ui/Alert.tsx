import type { ReactNode } from "react";

type AlertVariant = "ok" | "err" | "info";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  ok: "bg-[#e5f3ee] text-menta-deep border-[#bfe3d5]",
  err: "bg-[#f6e2e2] text-carmin border-[#e8c2c2]",
  info: "bg-[#e6eaf6] text-azul-deep border-[#c6d0ec]",
};

// Ver sección 11 de docs/design-system.html — color + ícono + texto,
// nunca el color solo como indicador.
function AlertIcon({ variant }: { variant: AlertVariant }) {
  if (variant === "ok") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  if (variant === "err") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function Alert({ variant, children }: { variant: AlertVariant; children: ReactNode }) {
  return (
    <div
      role={variant === "err" ? "alert" : "status"}
      className={`mb-3 flex items-start gap-3 rounded-md border px-4 py-3.5 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      <span aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0">
        <AlertIcon variant={variant} />
      </span>
      <div>{children}</div>
    </div>
  );
}
