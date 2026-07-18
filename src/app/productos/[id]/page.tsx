import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { CONDITION_LABELS, CONDITION_TONES } from "@/lib/product-labels";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { isSellerMpConnected } from "@/lib/mercadopago/tokens";
import { createCheckout } from "./actions";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { SellerBadge } from "@/components/ui/SellerBadge";
import type { SellerPublicProfile } from "@/types/database";

type ProductDetailRow = {
  id: number;
  title: string;
  description: string;
  price: number;
  seller_id: string;
  condition: keyof typeof CONDITION_LABELS;
  categories: { name: string } | null;
  zones: { name: string } | null;
  product_photos: { storage_path: string; is_primary: boolean; position: number }[];
};

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, title, description, price, seller_id, condition, categories(name), zones(name), product_photos(storage_path, is_primary, position)",
    )
    .eq("id", Number(id))
    .eq("status", "active")
    .maybeSingle<ProductDetailRow>();

  if (!product) notFound();

  const photos = [...product.product_photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.position - b.position;
  });

  const profile = await getCurrentProfile();
  const isOwner = profile?.id === product.seller_id;
  const sellerConnected = profile && !isOwner ? await isSellerMpConnected(product.seller_id) : false;

  const { data: sellerProfile } = await supabase
    .from("seller_public_profiles")
    .select("id, username, avatar_url")
    .eq("id", product.seller_id)
    .maybeSingle<SellerPublicProfile>();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {error && <Alert variant="err">{error}</Alert>}

      {photos.length > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.storage_path}
              className="relative aspect-square overflow-hidden rounded-md border border-border"
            >
              <Image
                src={getPublicStorageUrl("product-photos", photo.storage_path)}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-5 text-sm text-ink-soft">Sin fotos</p>
      )}

      <h1 className="font-display text-xl font-semibold text-ink">{product.title}</h1>
      <p className="mt-1 font-display text-2xl font-bold text-terracota-deep">
        ${product.price.toLocaleString("es-AR")}
      </p>

      <div className="mt-3">
        <SellerBadge
          username={sellerProfile?.username ?? null}
          avatarPath={sellerProfile?.avatar_url ?? null}
          size="md"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {product.categories?.name && <Chip tone="terra">{product.categories.name}</Chip>}
        {product.zones?.name && <Chip tone="azul">{product.zones.name}</Chip>}
        <Chip tone={CONDITION_TONES[product.condition]}>{CONDITION_LABELS[product.condition]}</Chip>
      </div>

      <p className="mt-5 text-[.95rem] whitespace-pre-wrap text-ink-soft">{product.description}</p>

      <div className="mt-6">
        {!profile ? (
          <p className="text-sm text-ink-soft">Iniciá sesión para poder comprar.</p>
        ) : isOwner ? (
          <p className="text-sm text-ink-soft">Esta es tu propia publicación.</p>
        ) : sellerConnected ? (
          <form action={createCheckout}>
            <input type="hidden" name="product_id" value={product.id} />
            <Button type="submit">Comprar</Button>
          </form>
        ) : (
          <p className="text-sm text-ink-soft">
            El vendedor todavía no conectó Mercado Pago, así que este producto no se puede
            comprar por ahora.
          </p>
        )}
      </div>
    </main>
  );
}
