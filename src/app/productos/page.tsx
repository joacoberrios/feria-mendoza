import { createClient } from "@/lib/supabase/server";
import { CONDITION_LABELS, CONDITION_TONES } from "@/lib/product-labels";
import { FilterChipGroup } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import type { ProductCondition } from "@/types/database";

type CatalogRow = {
  id: number;
  title: string;
  price: number;
  zone_id: number;
  condition: ProductCondition;
  product_photos: { storage_path: string; is_primary: boolean }[];
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category_id?: string;
    zone_id?: string;
    condition?: string;
    price_min?: string;
    price_max?: string;
    q?: string;
  }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: zones }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("active", true).order("name"),
    supabase.from("zones").select("id, name").eq("active", true).order("name"),
  ]);

  let query = supabase
    .from("products")
    .select("id, title, price, zone_id, condition, product_photos(storage_path, is_primary)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (filters.category_id) query = query.eq("category_id", Number(filters.category_id));
  if (filters.zone_id) query = query.eq("zone_id", Number(filters.zone_id));
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.price_min) query = query.gte("price", Number(filters.price_min));
  if (filters.price_max) query = query.lte("price", Number(filters.price_max));
  if (filters.q) {
    // La sintaxis de .or() de PostgREST usa "," y "()" como separadores de
    // condición: si no se sanean, texto de búsqueda con esos caracteres
    // podría inyectar condiciones extra en el filtro.
    const safeText = filters.q.replace(/[,()]/g, " ").trim();
    if (safeText) {
      query = query.or(`title.ilike.%${safeText}%,description.ilike.%${safeText}%`);
    }
  }

  const { data: products } = await query.returns<CatalogRow[]>();
  const zoneNameById = new Map((zones ?? []).map((z) => [z.id, z.name]));

  const categoryOptions = (categories ?? []).map((c) => ({ value: String(c.id), label: c.name }));
  const zoneOptions = (zones ?? []).map((z) => ({ value: String(z.id), label: z.name }));
  const conditionOptions = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-10">
      <h1 className="mb-6 font-display text-2xl font-semibold">Catálogo</h1>

      <form method="get" className="mb-8 flex flex-col gap-6">
        <FilterChipGroup
          name="category_id"
          groupLabel="Categoría"
          options={categoryOptions}
          selectedValue={filters.category_id ?? ""}
          tone="terra"
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

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-32">
            <TextField
              label="Precio mín."
              name="price_min"
              type="number"
              min="0"
              defaultValue={filters.price_min ?? ""}
            />
          </div>
          <div className="w-32">
            <TextField
              label="Precio máx."
              name="price_max"
              type="number"
              min="0"
              defaultValue={filters.price_max ?? ""}
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <TextField label="Buscar" name="q" defaultValue={filters.q ?? ""} />
          </div>
          <div className="mb-[18px] flex items-center gap-3">
            <Button type="submit">Filtrar</Button>
            <ButtonLink href="/productos" variant="ghost" size="sm">
              Limpiar
            </ButtonLink>
          </div>
        </div>
      </form>

      {(!products || products.length === 0) && (
        <p className="text-sm text-ink-soft">No hay productos que coincidan con la búsqueda.</p>
      )}

      <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {products?.map((p) => {
          const primaryPhoto =
            p.product_photos.find((ph) => ph.is_primary) ?? p.product_photos[0];

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
                }}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
