import type { SelectHTMLAttributes } from "react";
import { FIELD_CONTROL_CLASSES, FieldShell, describedByIds, fieldBorderClass } from "./Field";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
};

// Mismo patrón visual que TextField — ver sección 09 de
// docs/design-system.html (los selects siguen la misma paleta/foco).
export function Select({
  label,
  hint,
  error,
  id,
  name,
  className = "",
  children,
  ...props
}: SelectProps) {
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <FieldShell fieldId={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds(hintId, errorId)}
        className={`${FIELD_CONTROL_CLASSES} ${fieldBorderClass(!!error)} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
