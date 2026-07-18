import { Avatar } from "@/components/ui/Avatar";

export type SellerBadgeProps = {
  username: string | null;
  avatarPath: string | null;
  size?: "sm" | "md";
};

const LABEL_SIZE_CLASSES: Record<NonNullable<SellerBadgeProps["size"]>, string> = {
  sm: "text-xs",
  md: "text-sm",
};

// Placeholder razonable cuando el vendedor todavía no cargó foto/username
// (Fase F) — el círculo siempre ocupa el mismo espacio para no romper el
// layout de la grilla de tarjetas.
export function SellerBadge({ username, avatarPath, size = "sm" }: SellerBadgeProps) {
  const label = username ? `@${username}` : "Vendedor";
  const initial = username ? username[0]!.toUpperCase() : "?";

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Avatar avatarPath={avatarPath} initial={initial} alt={label} size={size} />
      <span className={`truncate text-ink-soft ${LABEL_SIZE_CLASSES[size]}`}>{label}</span>
    </div>
  );
}
