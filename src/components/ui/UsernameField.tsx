"use client";

import { useEffect, useRef, useState } from "react";
import { FIELD_CONTROL_CLASSES, FieldShell, fieldBorderClass } from "./Field";
import { USERNAME_PATTERN } from "@/lib/avatar-photo";
import {
  checkUsernameAvailability,
  type UsernameCheckResult,
} from "@/app/perfil/username-check";

export type UsernameFieldProps = {
  name: string;
  label: string;
  hint?: string;
  currentUsername: string | null;
};

const DEBOUNCE_MS = 450;

type CheckStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken"; suggestions: string[] }
  | { kind: "invalid" };

// Envuelve SOLO el campo de username con el chequeo de disponibilidad en
// vivo (Server Action aparte de updateProfile) — el resto del formulario
// de /perfil sigue siendo Server Component y no se entera de nada de
// esto: acá no hay ningún submit, solo un input controlado que viaja
// con el form al guardar, como cualquier otro campo.
export function UsernameField({ name, label, hint, currentUsername }: UsernameFieldProps) {
  const [value, setValue] = useState(currentUsername ?? "");
  const [status, setStatus] = useState<CheckStatus>({ kind: "idle" });
  // Descarta respuestas fuera de orden: si una consulta vieja resuelve
  // después de una más nueva, no puede pisar el estado actual.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = value.trim();
    const isCurrent =
      currentUsername !== null && trimmed.toLowerCase() === currentUsername.toLowerCase();

    if (!trimmed || isCurrent) {
      setStatus({ kind: "idle" });
      return;
    }

    if (!USERNAME_PATTERN.test(trimmed)) {
      // El formato inválido ya lo explica el hint + la validación del
      // submit; acá solo evitamos consultar al servidor por algo que
      // nunca puede estar "disponible".
      setStatus({ kind: "invalid" });
      return;
    }

    setStatus({ kind: "checking" });
    const requestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      let result: UsernameCheckResult;
      try {
        result = await checkUsernameAvailability(trimmed);
      } catch {
        // Sin red o error transitorio: no bloquear — el submit real
        // valida contra el índice único igual.
        if (requestId === requestIdRef.current) setStatus({ kind: "idle" });
        return;
      }

      if (requestId !== requestIdRef.current) return;

      if (result.status === "available") {
        setStatus({ kind: "available" });
      } else if (result.status === "taken") {
        setStatus({ kind: "taken", suggestions: result.suggestions });
      } else {
        setStatus({ kind: "invalid" });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, currentUsername]);

  const isTaken = status.kind === "taken";

  return (
    <FieldShell fieldId={name} label={label} hint={hint}>
      <input
        id={name}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        pattern={USERNAME_PATTERN.source}
        minLength={3}
        maxLength={20}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={isTaken ? true : undefined}
        aria-describedby={`${name}-status`}
        className={`${FIELD_CONTROL_CLASSES} ${fieldBorderClass(isTaken)}`}
      />

      <div id={`${name}-status`} aria-live="polite" className="mt-[5px] min-h-[1.2em]">
        {status.kind === "checking" && (
          <p className="text-[.78rem] text-ink-soft">Verificando disponibilidad…</p>
        )}
        {status.kind === "available" && (
          <p className="text-[.78rem] font-medium text-vid-deep">✓ Disponible</p>
        )}
        {isTaken && (
          <>
            <p className="text-[.78rem] font-medium text-carmin">
              Ese nombre de usuario ya está en uso.
            </p>
            {status.suggestions.length > 0 ? (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[.78rem] text-ink-soft">
                Probá con:
                {status.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setValue(suggestion)}
                    className="rounded-pill border border-border bg-bg-subtle px-2 py-0.5 font-medium text-azul-deep hover:bg-border focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2"
                  >
                    {suggestion}
                  </button>
                ))}
              </p>
            ) : (
              <p className="mt-1 text-[.78rem] text-ink-soft">
                No pudimos sugerir alternativas — probá con otra variante.
              </p>
            )}
          </>
        )}
      </div>
    </FieldShell>
  );
}
