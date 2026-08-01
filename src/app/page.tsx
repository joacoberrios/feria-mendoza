import { getCurrentProfile } from "@/lib/supabase/profile";
import { formatFullName } from "@/lib/identity";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import type { ProductCondition, SellerPublicProfile } from "@/types/database";

type OfferRow = {
  id: number;
  title: string;
  price: number;
  original_price: number;
  condition: ProductCondition;
  zone_id: number;
  seller_id: string;
  product_photos: { storage_path: string; is_primary: boolean }[];
  zones: { name: string } | null;
};

const OFFERS_LIMIT = 8;

export default async function Home() {
  const supabase = await createClient();
  const [profile, { data: zones }] = await Promise.all([
    getCurrentProfile(),
    supabase.from("zones").select("id, name").eq("active", true),
  ]);

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10">
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface p-8 shadow-md sm:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-pill opacity-20 blur-[2px]"
          style={{
            background:
              "conic-gradient(from 20deg, #4E63A8 0 14%, #A84A22 14% 30%, #6E4E96 30% 46%, #B23A3A 46% 60%, #4FA98C 60% 74%, #C4C4DD 74% 88%, #4E63A8 88% 100%)",
          }}
        />
        <p className="font-mono text-[.78rem] font-semibold tracking-[2px] text-malbec uppercase">
          Marketplace local
        </p>
        <h1 className="relative z-10 mt-3.5 max-w-[16ch] font-display text-3xl leading-tight font-bold sm:text-4xl">
          Comprá y vendé en Mendoza, cerca tuyo.
        </h1>
        <p className="relative z-10 mt-4 max-w-[56ch] text-[1.05rem] text-ink-soft">
          {profile
            ? `Hola, ${formatFullName(profile) || profile.email} — publicá productos gratis y comprá con Mercado Pago.`
            : "Publicá gratis, encontrá lo que buscás y pagá seguro con Mercado Pago."}
        </p>
        <div className="relative z-10 mt-6 flex flex-wrap gap-3.5">
          <ButtonLink href="/productos" variant="primary">
            Ver catálogo
          </ButtonLink>
          {profile ? (
            <ButtonLink href="/publicar" variant="ghost">
              Publicar producto
            </ButtonLink>
          ) : (
            <ButtonLink href="/register" variant="ghost">
              Crear cuenta
            </ButtonLink>
          )}
        </div>
      </section>

      <OfferSection supabase={supabase} zoneNameById={new Map((zones ?? []).map((z) => [z.id, z.name]))} />
    </main>
  );
}

async function OfferSection({
  supabase,
  zoneNameById,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  zoneNameById: Map<number, string>;
}) {
  const { data: rawOffers } = await supabase
    .from("products")
    .select("id, title, price, original_price, condition, zone_id, seller_id, product_photos(storage_path, is_primary), zones(name)")
    .eq("status", "active")
    .not("original_price", "is", null)
    .returns<OfferRow[]>();

  const offers = (rawOffers ?? [])
    .filter((p) => p.original_price > p.price)
    .sort((a, b) => (1 - b.price / b.original_price) - (1 - a.price / a.original_price))
    .slice(0, OFFERS_LIMIT);

  if (offers.length === 0) return null;

  const sellerIds = [...new Set(offers.map((p) => p.seller_id))];
  const { data: sellerProfiles } = await supabase
    .from("seller_public_profiles")
    .select("id, username, avatar_url")
    .in("id", sellerIds)
    .returns<SellerPublicProfile[]>();
  const sellerById = new Map((sellerProfiles ?? []).map((s) => [s.id, s]));

  return (
    <section className="mt-10">
      <h2 className="mb-1 font-display text-2xl font-bold text-malbec">🤫 Mansas Ofertas</h2>
      <p className="mb-6 text-sm text-ink-soft">Los mejores descuentos del momento.</p>
      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {offers.map((p) => {
          const primaryPhoto = p.product_photos.find((ph) => ph.is_primary) ?? p.product_photos[0];
          const seller = sellerById.get(p.seller_id);
          return (
            <li key={p.id}>
              <ProductCard
                product={{
                  id: p.id,
                  title: p.title,
                  price: p.price,
                  originalPrice: p.original_price,
                  condition: p.condition,
                  zoneName: zoneNameById.get(p.zone_id) ?? p.zones?.name ?? null,
                  photoPath: primaryPhoto?.storage_path ?? null,
                  sellerUsername: seller?.username ?? null,
                  sellerAvatarPath: seller?.avatar_url ?? null,
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
