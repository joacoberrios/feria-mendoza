import type { InputHTMLAttributes } from "react";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

// Ver sección 09 de docs/design-system.html — label siempre visible
// (nunca solo placeholder), error con ícono + aria-describedby.
export function TextField({
  label,
  hint,
  error,
  id,
  name,
  className = "",
  ...props
}: TextFieldProps) {
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="mb-[18px] max-w-[420px]">
      <label htmlFor={fieldId} className="mb-1.5 block text-[.85rem] font-semibold text-ink">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`min-h-11 w-full rounded-md border-[1.5px] bg-white px-3.5 py-3 text-base text-ink placeholder:text-[#a49fac] focus:border-azul-deep focus:shadow-[0_0_0_3px_rgba(62,82,144,.18)] focus:outline-none ${
          error ? "border-carmin" : "border-border"
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="mt-[5px] text-[.76rem] text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-[5px] flex items-center gap-[5px] text-[.78rem] font-medium text-carmin">
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
          {error}
        </p>
      )}
    </div>
  );
}
