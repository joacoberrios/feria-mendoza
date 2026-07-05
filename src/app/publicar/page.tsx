import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-photo";
import { createProduct } from "./actions";

export default async function PublishProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.verification_status !== "approved") {
    redirect(
      `/verificacion?error=${encodeURIComponent("Necesitás verificar tu identidad antes de publicar productos.")}`,
    );
  }

  const supabase = await createClient();
  const [{ data: categories }, { data: zones }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("active", true).order("name"),
    supabase.from("zones").select("id, name").eq("active", true).order("name"),
  ]);

  const photoSlots = Array.from({ length: MAX_PRODUCT_PHOTOS }, (_, i) => i + 1);

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold mb-4">Publicar producto</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form action={createProduct} className="flex flex-col gap-3">
        <label className="text-sm">
          Título
          <input name="title" required className="mt-1 w-full border rounded px-3 py-2" />
        </label>
        <label className="text-sm">
          Descripción
          <textarea
            name="description"
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
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Categoría
          <select name="category_id" required className="mt-1 w-full border rounded px-3 py-2">
            <option value="" disabled>
              Elegí una categoría
            </option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Zona
          <select name="zone_id" required className="mt-1 w-full border rounded px-3 py-2">
            <option value="" disabled>
              Elegí tu zona
            </option>
            {zones?.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Condición
          <select name="condition" required className="mt-1 w-full border rounded px-3 py-2">
            <option value="" disabled>
              Elegí la condición
            </option>
            <option value="nuevo">Nuevo</option>
            <option value="como_nuevo">Como nuevo</option>
            <option value="usado">Usado</option>
          </select>
        </label>

        <fieldset className="border rounded p-3">
          <legend className="text-sm px-1">Fotos (hasta {MAX_PRODUCT_PHOTOS})</legend>
          <div className="flex flex-col gap-2">
            {photoSlots.map((slot) => (
              <label key={slot} className="text-sm">
                Foto {slot} {slot === 1 ? "(obligatoria)" : "(opcional)"}
                <input
                  type="file"
                  name={`photo_${slot}`}
                  accept="image/*"
                  required={slot === 1}
                  className="mt-1 block"
                />
              </label>
            ))}
          </div>
          <label className="text-sm mt-3 block">
            Foto principal
            <select
              name="primary_slot"
              defaultValue="1"
              className="mt-1 w-full border rounded px-3 py-2"
            >
              {photoSlots.map((slot) => (
                <option key={slot} value={slot}>
                  Foto {slot}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <button type="submit" className="bg-black text-white rounded px-3 py-2">
          Publicar
        </button>
      </form>
    </main>
  );
}
