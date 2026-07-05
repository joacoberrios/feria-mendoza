import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { CONDITION_LABELS } from "@/lib/product-labels";

type CatalogRow = {
  id: number;
  title: string;
  price: number;
  zone_id: number;
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
    .select("id, title, price, zone_id, product_photos(storage_path, is_primary)")
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

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold mb-6">Catálogo</h1>

      <form method="get" className="mb-6 flex flex-wrap gap-3 items-end text-sm">
        <label>
          Categoría
          <select
            name="category_id"
            defaultValue={filters.category_id ?? ""}
            className="mt-1 block border rounded px-2 py-1"
          >
            <option value="">Todas</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zona
          <select
            name="zone_id"
            defaultValue={filters.zone_id ?? ""}
            className="mt-1 block border rounded px-2 py-1"
          >
            <option value="">Todas</option>
            {zones?.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Condición
          <select
            name="condition"
            defaultValue={filters.condition ?? ""}
            className="mt-1 block border rounded px-2 py-1"
          >
            <option value="">Todas</option>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Precio mín.
          <input
            name="price_min"
            type="number"
            min="0"
            defaultValue={filters.price_min ?? ""}
            className="mt-1 block border rounded px-2 py-1 w-24"
          />
        </label>
        <label>
          Precio máx.
          <input
            name="price_max"
            type="number"
            min="0"
            defaultValue={filters.price_max ?? ""}
            className="mt-1 block border rounded px-2 py-1 w-24"
          />
        </label>
        <label>
          Buscar
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            className="mt-1 block border rounded px-2 py-1"
          />
        </label>
        <button type="submit" className="border rounded px-3 py-1">
          Filtrar
        </button>
        <Link href="/productos" className="underline">
          Limpiar
        </Link>
      </form>

      {(!products || products.length === 0) && (
        <p className="text-sm">No hay productos que coincidan con la búsqueda.</p>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products?.map((p) => {
          const primaryPhoto =
            p.product_photos.find((ph) => ph.is_primary) ?? p.product_photos[0];

          return (
            <li key={p.id}>
              <Link
                href={`/productos/${p.id}`}
                className="block border rounded p-2 hover:bg-gray-50"
              >
                {primaryPhoto ? (
                  <Image
                    src={getPublicStorageUrl("product-photos", primaryPhoto.storage_path)}
                    alt={p.title}
                    width={200}
                    height={150}
                    className="w-full h-32 object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center text-xs text-gray-500 border rounded">
                    Sin foto
                  </div>
                )}
                <p className="mt-2 text-sm font-medium truncate">{p.title}</p>
                <p className="text-sm text-gray-600">${p.price}</p>
                <p className="text-xs text-gray-500">{zoneNameById.get(p.zone_id) ?? ""}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
