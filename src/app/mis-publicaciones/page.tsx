import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { STATUS_LABELS } from "@/lib/product-labels";
import { pauseProduct, reactivateProduct, markAsSold, removeProduct } from "./actions";

type ProductRow = {
  id: number;
  title: string;
  price: number;
  status: keyof typeof STATUS_LABELS;
  product_photos: { storage_path: string; is_primary: boolean }[];
};

export default async function MyProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, status, product_photos(storage_path, is_primary)")
    .eq("seller_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<ProductRow[]>();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold mb-6">Mis publicaciones</h1>
      {created && <p className="mb-4 text-sm text-green-600">Producto publicado.</p>}
      <p className="mb-4 text-sm">
        <Link href="/publicar" className="underline">
          + Publicar producto
        </Link>
      </p>

      {(!products || products.length === 0) && (
        <p className="text-sm">Todavía no publicaste nada.</p>
      )}

      <ul className="flex flex-col gap-4">
        {products?.map((p) => {
          const primaryPhoto =
            p.product_photos.find((ph) => ph.is_primary) ?? p.product_photos[0];

          return (
            <li key={p.id} className="border rounded p-4 flex gap-4 items-center">
              {primaryPhoto ? (
                <Image
                  src={getPublicStorageUrl("product-photos", primaryPhoto.storage_path)}
                  alt={p.title}
                  width={96}
                  height={96}
                  className="rounded border object-cover"
                />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center text-xs text-gray-500 border rounded">
                  Sin foto
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-gray-600">
                  ${p.price} — {STATUS_LABELS[p.status] ?? p.status}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <Link href={`/mis-publicaciones/${p.id}/editar`} className="underline">
                    Editar
                  </Link>
                  {p.status === "active" && (
                    <form action={pauseProduct}>
                      <input type="hidden" name="product_id" value={p.id} />
                      <button type="submit" className="underline">
                        Pausar
                      </button>
                    </form>
                  )}
                  {p.status === "paused" && (
                    <form action={reactivateProduct}>
                      <input type="hidden" name="product_id" value={p.id} />
                      <button type="submit" className="underline">
                        Reactivar
                      </button>
                    </form>
                  )}
                  {(p.status === "active" || p.status === "paused") && (
                    <>
                      <form action={markAsSold}>
                        <input type="hidden" name="product_id" value={p.id} />
                        <button type="submit" className="underline">
                          Marcar vendido
                        </button>
                      </form>
                      <form action={removeProduct}>
                        <input type="hidden" name="product_id" value={p.id} />
                        <button type="submit" className="underline text-red-600">
                          Eliminar
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
