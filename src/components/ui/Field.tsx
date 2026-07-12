import type { ReactNode } from "react";

// Estilos compartidos por TextField/Select/Textarea — ver sección 09 de
// docs/design-system.html. Un solo lugar para el borde/foco/radio de
// cualquier control de formulario, así quedan visualmente idénticos.
export const FIELD_CONTROL_CLASSES =
  "min-h-11 w-full rounded-md border-[1.5px] bg-white px-3.5 py-3 text-base text-ink placeholder:text-[#a49fac] focus:border-azul-deep focus:shadow-[0_0_0_3px_rgba(62,82,144,.18)] focus:outline-none";

export function fieldBorderClass(hasError: boolean) {
  return hasError ? "border-carmin" : "border-border";
}

export function describedByIds(hintId?: string, errorId?: string) {
  return [hintId, errorId].filter(Boolean).join(" ") || undefined;
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export function FieldShell({
  fieldId,
  label,
  hint,
  error,
  children,
}: {
  fieldId?: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="mb-[18px] max-w-[420px]">
      <label htmlFor={fieldId} className="mb-1.5 block text-[.85rem] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="mt-[5px] text-[.76rem] text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-[5px] flex items-center gap-[5px] text-[.78rem] font-medium text-carmin">
          <ErrorIcon />
          {error}
        </p>
      )}
    </div>
  );
}
