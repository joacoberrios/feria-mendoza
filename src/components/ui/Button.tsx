import type { ButtonHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "base" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-terracota-deep text-white shadow-sm hover:bg-[#93401d] hover:shadow-md disabled:bg-border disabled:text-[#9a95a0] disabled:shadow-none",
  secondary:
    "bg-azul text-white hover:bg-azul-deep disabled:bg-border disabled:text-[#9a95a0]",
  ghost:
    "bg-transparent text-terracota-deep border-2 border-terracota-deep hover:bg-terracota-deep/8 disabled:border-border disabled:text-[#9a95a0] disabled:hover:bg-transparent",
  // No está definida en docs/design-system.html (la sección 06 solo cubre
  // primary/secondary/ghost) — se suma acá reusando --carmin, que el
  // design system ya reserva para error/alerta, para acciones
  // destructivas (ej. "Eliminar" en mis-publicaciones).
  danger:
    "bg-carmin text-white shadow-sm hover:bg-[#932e2e] hover:shadow-md disabled:bg-border disabled:text-[#9a95a0] disabled:shadow-none",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-sm px-[18px] py-[10px] min-h-[38px]",
  base: "text-base px-6 py-[14px] min-h-11",
  lg: "text-lg px-[30px] py-[17px] min-h-[52px]",
};

export function buttonClasses(variant: ButtonVariant, size: ButtonSize, className: string) {
  return `inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-[background,box-shadow,transform] duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

// Botón compartido — ver sección 06 de docs/design-system.html. Un solo
// botón primario por pantalla; el texto describe la acción exacta.
export function Button({
  variant = "primary",
  size = "base",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"
        />
      )}
      {children}
    </button>
  );
}

export type ButtonLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  };

// Para CTAs de navegación (no envían un form) — nunca anidar un <button>
// dentro de un <Link>, son dos elementos interactivos, HTML inválido.
export function ButtonLink({
  variant = "primary",
  size = "base",
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`${buttonClasses(variant, size, className)} hover:no-underline`} {...props}>
      {children}
    </Link>
  );
}
