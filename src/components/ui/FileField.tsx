"use client";

import { useState, type ChangeEvent } from "react";
import { FieldShell, describedByIds } from "./Field";

export type FileFieldProps = {
  id?: string;
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  accept?: string;
  maxSizeBytes?: number;
};

// Input de archivo con el mismo patrón de label/hint/error que TextField —
// ver sección 09 de docs/design-system.html. Valida el tamaño en el
// cliente (con respaldo server-side en cada action) para dar feedback
// inmediato sin esperar el submit.
export function FileField({
  id,
  name,
  label,
  hint,
  required,
  accept = "image/*",
  maxSizeBytes,
}: FileFieldProps) {
  const [error, setError] = useState<string | null>(null);
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setError(null);
      return;
    }

    if (maxSizeBytes && file.size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / 1024 / 1024).toFixed(0);
      setError(
        `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB, el máximo es ${maxMb}MB. Elegí una foto más liviana.`,
      );
      event.target.value = "";
      return;
    }

    setError(null);
  }

  return (
    <FieldShell fieldId={fieldId} label={label} hint={hint} error={error ?? undefined}>
      <input
        type="file"
        id={fieldId}
        name={name}
        accept={accept}
        required={required}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds(hintId, errorId)}
        className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-pill file:border-0 file:bg-azul file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:transition-colors hover:file:bg-azul-deep focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2"
      />
    </FieldShell>
  );
}
