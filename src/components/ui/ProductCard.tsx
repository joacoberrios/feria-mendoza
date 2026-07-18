import Image from "next/image";
import Link from "next/link";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { CONDITION_LABELS } from "@/lib/product-labels";
import { SellerBadge } from "@/components/ui/SellerBadge";
import type { ProductCondition } from "@/types/database";

// Badges son sólidos (a diferencia de los chips, que son pastel) — ver
// sección 08 de docs/design-system.html.
const BADGE_CLASSES: Record<ProductCondition, string> = {
  nuevo: "bg-menta-deep",
  como_nuevo: "bg-azul",
  usado: "bg-ciruela",
};

export type ProductCardData = {
  id: number;
  title: string;
  price: number;
  condition: ProductCondition;
  zoneName?: string | null;
  photoPath: string | null;
  sellerUsername?: string | null;
  sellerAvatarPath?: string | null;
};

// Tarjeta de producto — ver sección 08 de docs/design-system.html
// (patrón .pcard: foto 1:1, hover con elevación, precio en Fredoka).
export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/productos/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-1 hover:shadow-lg hover:no-underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-lavanda to-[#dfe0ee]">
        {product.photoPath ? (
          <Image
            src={getPublicStorageUrl("product-photos", product.photoPath)}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[#8b86a3]">
            Sin foto
          </div>
        )}
        <span
          className={`absolute top-2.5 left-2.5 rounded-pill px-2.5 py-1 text-[.66rem] font-bold tracking-wide text-white uppercase ${BADGE_CLASSES[product.condition]}`}
        >
          {CONDITION_LABELS[product.condition]}
        </span>
      </div>
      <div className="p-3.5">
        <p className="truncate text-[.98rem] font-semibold text-ink">{product.title}</p>
        <p className="mt-0.5 font-display text-lg font-bold text-terracota-deep">
          ${product.price.toLocaleString("es-AR")}
        </p>
        {product.zoneName && <p className="mt-0.5 text-xs text-ink-soft">{product.zoneName}</p>}
        <div className="mt-2">
          <SellerBadge
            username={product.sellerUsername ?? null}
            avatarPath={product.sellerAvatarPath ?? null}
          />
        </div>
      </div>
    </Link>
  );
}
