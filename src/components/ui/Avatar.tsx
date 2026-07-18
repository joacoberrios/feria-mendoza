import Image from "next/image";
import { getPublicStorageUrl } from "@/lib/supabase/storage";

export type AvatarProps = {
  avatarPath: string | null;
  initial: string;
  alt: string;
  size?: "sm" | "md";
};

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
};

// Círculo de foto de perfil con fallback a inicial — compartido por
// SellerBadge (catálogo/detalle de producto) y el Topbar, para no
// duplicar el manejo de imagen-o-placeholder en cada lugar.
export function Avatar({ avatarPath, initial, alt, size = "sm" }: AvatarProps) {
  return (
    <div
      className={`relative flex-none overflow-hidden rounded-full bg-lavanda font-bold text-ink-soft ${SIZE_CLASSES[size]}`}
    >
      {avatarPath ? (
        <Image
          src={getPublicStorageUrl("avatars", avatarPath)}
          alt={alt}
          fill
          sizes="40px"
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center">{initial}</span>
      )}
    </div>
  );
}
