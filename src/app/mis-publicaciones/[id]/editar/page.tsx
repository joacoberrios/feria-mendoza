import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Product } from "@/types/database";
import { updateProduct } from "./actions";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", Number(id))
    .eq("seller_id", profile.id)
    .maybeSingle<Product>();

  if (!product) notFound();

  const [{ data: categories }, { data: zones }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("active", true).order("name"),
    supabase.from("zones").select("id, name").eq("active", true).order("name"),
  ]);

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold mb-4">Editar producto</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {saved && <p className="mb-4 text-sm text-green-600">Cambios guardados.</p>}

      <form action={updateProduct} className="flex flex-col gap-3">
        <input type="hidden" name="product_id" value={product.id} />
        <label className="text-sm">
          Título
          <input
            name="title"
            defaultValue={product.title}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Descripción
          <textarea
            name="description"
            defaultValue={product.description}
            required
            rows={4}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Precio
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product.price}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Categoría
          <select
            name="category_id"
            defaultValue={product.category_id}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          >
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Zona
          <select
            name="zone_id"
            defaultValue={product.zone_id}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          >
            {zones?.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Condición
          <select
            name="condition"
            defaultValue={product.condition}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="nuevo">Nuevo</option>
            <option value="como_nuevo">Como nuevo</option>
            <option value="usado">Usado</option>
          </select>
        </label>
        <button type="submit" className="bg-black text-white rounded px-3 py-2">
          Guardar cambios
        </button>
      </form>
    </main>
  );
}
