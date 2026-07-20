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
import { StarRating } from "@/components/ui/StarRating";
import { ReviewsSection } from "@/components/ui/ReviewsSection";
import type { SellerPublicProfile, SellerReputation, ReviewWithReviewer } from "@/types/database";

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

type UnreviewedOrder = { id: number; product_title: string };

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; review_ok?: string; review_error?: string }>;
}) {
  const { id } = await params;
  const { error, review_ok, review_error } = await searchParams;
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

  const [sellerProfileResult, reputationResult, reviewsResult] = await Promise.all([
    supabase
      .from("seller_public_profiles")
      .select("id, username, avatar_url")
      .eq("id", product.seller_id)
      .maybeSingle<SellerPublicProfile>(),
    supabase
      .from("seller_reputation")
      .select("seller_id, confirmed_sales, review_count, avg_rating")
      .eq("seller_id", product.seller_id)
      .maybeSingle<SellerReputation>(),
    supabase
      .from("reviews")
      .select("*")
      .eq("seller_id", product.seller_id)
      .order("created_at", { ascending: false }),
  ]);

  const sellerProfile = sellerProfileResult.data;
  const reputation = reputationResult.data;
  const rawReviews = reviewsResult.data ?? [];

  // Fetch reviewer profiles in one batch
  const reviewerIds = [...new Set(rawReviews.map((r) => r.reviewer_id as string))];
  let reviewerMap: Record<string, SellerPublicProfile> = {};
  if (reviewerIds.length > 0) {
    const { data: reviewerProfiles } = await supabase
      .from("seller_public_profiles")
      .select("id, username, avatar_url")
      .in("id", reviewerIds);
    reviewerMap = Object.fromEntries(
      (reviewerProfiles ?? []).map((p) => [p.id, p as SellerPublicProfile]),
    );
  }

  const reviews: ReviewWithReviewer[] = rawReviews.map((r) => ({
    ...(r as import("@/types/database").Review),
    reviewer: reviewerMap[r.reviewer_id as string] ?? null,
  }));

  // Órdenes del usuario actual con este vendedor que aún no tienen reseña
  let unreviewedOrders: UnreviewedOrder[] = [];
  if (profile && !isOwner) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, products(title)")
      .eq("buyer_id", profile.id)
      .eq("seller_id", product.seller_id)
      .in("status", ["paid", "delivered", "disputed", "resolved"]);

    if (orders) {
      const reviewedOrderIds = new Set(reviews.map((r) => r.order_id));
      unreviewedOrders = orders
        .filter((o) => !reviewedOrderIds.has(o.id))
        .map((o) => ({
          id: o.id,
          product_title:
            (o.products as unknown as { title: string } | null)?.title ?? "Producto",
        }));
    }
  }

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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SellerBadge
          username={sellerProfile?.username ?? null}
          avatarPath={sellerProfile?.avatar_url ?? null}
          size="md"
        />
        {reputation && reputation.review_count > 0 && (
          <StarRating
            rating={reputation.avg_rating}
            count={reputation.review_count}
            size="md"
          />
        )}
        {reputation && reputation.confirmed_sales > 0 && (
          <span className="text-xs text-ink-soft">
            {reputation.confirmed_sales}{" "}
            {reputation.confirmed_sales === 1 ? "venta" : "ventas"}
          </span>
        )}
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

      <ReviewsSection
        reviews={reviews}
        sellerId={product.seller_id}
        productId={product.id}
        currentUserId={profile?.id ?? null}
        isOwner={isOwner}
        unreviewedOrders={unreviewedOrders}
        reviewOk={review_ok === "1"}
        reviewError={review_error ?? null}
      />
    </main>
  );
}
