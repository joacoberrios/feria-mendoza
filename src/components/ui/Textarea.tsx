import type { TextareaHTMLAttributes } from "react";
import { FIELD_CONTROL_CLASSES, FieldShell, describedByIds, fieldBorderClass } from "./Field";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

// Mismo patrón visual que TextField — ver sección 09 de docs/design-system.html.
export function Textarea({
  label,
  hint,
  error,
  id,
  name,
  className = "",
  ...props
}: TextareaProps) {
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <FieldShell fieldId={fieldId} label={label} hint={hint} error={error}>
      <textarea
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds(hintId, errorId)}
        className={`${FIELD_CONTROL_CLASSES} min-h-0 resize-y ${fieldBorderClass(!!error)} ${className}`}
        {...props}
      />
    </FieldShell>
  );
}
