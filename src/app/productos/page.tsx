import { createClient } from "@/lib/supabase/server";
import { CONDITION_LABELS, CONDITION_TONES } from "@/lib/product-labels";
import { fetchCategoryTree } from "@/lib/categories";
import { FilterChipGroup } from "@/components/ui/Chip";
import { FilterSidebar } from "@/components/ui/FilterSidebar";
import { CategoryFilterChips } from "@/components/ui/CategoryFilterChips";
import { TextField } from "@/components/ui/TextField";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import type { ProductCondition, SellerPublicProfile } from "@/types/database";

type CatalogRow = {
  id: number;
  title: string;
  price: number;
  zone_id: number;
  condition: ProductCondition;
  seller_id: string;
  product_photos: { storage_path: string; is_primary: boolean }[];
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category_id?: string;
    sub_id?: string;
    zone_id?: string;
    condition?: string;
    price_min?: string;
    price_max?: string;
    q?: string;
  }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();

  const [categoryTree, { data: zones }] = await Promise.all([
    fetchCategoryTree(supabase),
    supabase.from("zones").select("id, name").eq("active", true).order("name"),
  ]);

  const topId = filters.category_id ? Number(filters.category_id) : null;
  const subId = filters.sub_id ? Number(filters.sub_id) : null;
  const selectedParent = topId ? categoryTree.parents.find((p) => p.id === topId) : undefined;
  const effectiveSubId =
    selectedParent && subId && selectedParent.children.some((c) => c.id === subId) ? subId : null;

  let query = supabase
    .from("products")
    .select("id, title, price, zone_id, condition, seller_id, product_photos(storage_path, is_primary)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (effectiveSubId) {
    query = query.eq("category_id", effectiveSubId);
  } else if (selectedParent) {
    query = query.in(
      "category_id",
      selectedParent.children.map((c) => c.id),
    );
  } else if (topId) {
    query = query.eq("category_id", topId);
  }
  if (filters.zone_id) query = query.eq("zone_id", Number(filters.zone_id));
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.price_min) query = query.gte("price", Number(filters.price_min));
  if (filters.price_max) query = query.lte("price", Number(filters.price_max));
  if (filters.q) {
    const safeText = filters.q.replace(/[,()]/g, " ").trim();
    if (safeText) {
      query = query.or(`title.ilike.%${safeText}%,description.ilike.%${safeText}%`);
    }
  }

  const { data: products } = await query.returns<CatalogRow[]>();
  const zoneNameById = new Map((zones ?? []).map((z) => [z.id, z.name]));

  const sellerIds = Array.from(new Set((products ?? []).map((p) => p.seller_id)));
  const { data: sellerProfiles } = sellerIds.length
    ? await supabase
        .from("seller_public_profiles")
        .select("id, username, avatar_url")
        .in("id", sellerIds)
        .returns<SellerPublicProfile[]>()
    : { data: [] as SellerPublicProfile[] };
  const sellerById = new Map((sellerProfiles ?? []).map((s) => [s.id, s]));

  const zoneOptions = (zones ?? []).map((z) => ({ value: String(z.id), label: z.name }));
  const conditionOptions = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  // Badge en el botón trigger: cuántos filtros (sin contar q) están activos
  const activeFilterCount = [
    filters.category_id,
    filters.zone_id,
    filters.condition,
    filters.price_min,
    filters.price_max,
  ].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold">Catálogo</h1>

      <form method="get">
        {/* Buscador de texto — siempre visible, fuera del panel */}
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <TextField label="Buscar" name="q" defaultValue={filters.q ?? ""} />
          </div>
          <div className="mb-[18px]">
            <ButtonLink href="/productos" variant="ghost" size="sm">
              Limpiar todo
            </ButtonLink>
          </div>
        </div>

        <div className="md:flex md:items-start md:gap-8">
          {/* Panel lateral de filtros */}
          <FilterSidebar activeFilterCount={activeFilterCount}>
            <CategoryFilterChips
              tree={categoryTree}
              defaultCategoryId={topId}
              defaultSubId={effectiveSubId}
            />
            <FilterChipGroup
              name="zone_id"
              groupLabel="Zona"
              options={zoneOptions}
              selectedValue={filters.zone_id ?? ""}
              tone="azul"
            />
            <FilterChipGroup
              name="condition"
              groupLabel="Condición"
              options={conditionOptions}
              selectedValue={filters.condition ?? ""}
              toneFor={(value) => CONDITION_TONES[value as ProductCondition] ?? "line"}
            />

            <div className="flex flex-wrap gap-3">
              <div className="w-28">
                <TextField
                  label="Precio mín."
                  name="price_min"
                  type="number"
                  min="0"
                  defaultValue={filters.price_min ?? ""}
                />
              </div>
              <div className="w-28">
                <TextField
                  label="Precio máx."
                  name="price_max"
                  type="number"
                  min="0"
                  defaultValue={filters.price_max ?? ""}
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              Aplicar filtros
            </Button>
          </FilterSidebar>

          {/* Grilla de productos */}
          <div className="min-w-0 flex-1">
            {(!products || products.length === 0) && (
              <p className="text-sm text-ink-soft">
                No hay productos que coincidan con la búsqueda.
              </p>
            )}

            <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {products?.map((p) => {
                const primaryPhoto =
                  p.product_photos.find((ph) => ph.is_primary) ?? p.product_photos[0];
                const sellerProfile = sellerById.get(p.seller_id);

                return (
                  <li key={p.id}>
                    <ProductCard
                      product={{
                        id: p.id,
                        title: p.title,
                        price: p.price,
                        condition: p.condition,
                        zoneName: zoneNameById.get(p.zone_id),
                        photoPath: primaryPhoto?.storage_path ?? null,
                        sellerUsername: sellerProfile?.username ?? null,
                        sellerAvatarPath: sellerProfile?.avatar_url ?? null,
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </form>
    </main>
  );
}
