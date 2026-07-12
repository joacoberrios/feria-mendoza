"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { buttonClasses, type ButtonVariant, type ButtonSize } from "./Button";

export type ConfirmButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

// Para acciones destructivas dentro de un <form action={...}> (Server
// Action) — pide confirmación nativa (accesible por teclado y lector de
// pantalla) antes de dejar pasar el submit. No está en
// docs/design-system.html, se definió para esta fase (ver sección
// "acción destructiva" acordada con el equipo). Queda aislado acá para
// que Button.tsx siga siendo un Server Component puro sin JS.
export function ConfirmButton({
  confirmMessage,
  variant = "danger",
  size = "base",
  className = "",
  onClick,
  children,
  ...props
}: ConfirmButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      type="submit"
      className={buttonClasses(variant, size, className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
