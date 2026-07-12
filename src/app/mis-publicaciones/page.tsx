import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/product-labels";
import { pauseProduct, reactivateProduct, markAsSold, removeProduct } from "./actions";
import { Chip } from "@/components/ui/Chip";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Alert } from "@/components/ui/Alert";

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
      <h1 className="mb-6 font-display text-xl font-semibold">Mis publicaciones</h1>
      {created && <Alert variant="ok">Producto publicado.</Alert>}

      <div className="mb-4">
        <ButtonLink href="/publicar" size="sm">
          + Publicar producto
        </ButtonLink>
      </div>

      {(!products || products.length === 0) && (
        <p className="text-sm text-ink-soft">Todavía no publicaste nada.</p>
      )}

      <ul className="flex flex-col gap-4">
        {products?.map((p) => {
          const primaryPhoto =
            p.product_photos.find((ph) => ph.is_primary) ?? p.product_photos[0];

          return (
            <li
              key={p.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              {primaryPhoto ? (
                <Image
                  src={getPublicStorageUrl("product-photos", primaryPhoto.storage_path)}
                  alt={p.title}
                  width={96}
                  height={96}
                  className="rounded-md border border-border object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md border border-border text-xs text-ink-soft">
                  Sin foto
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-ink">{p.title}</p>
                <p className="mt-0.5 font-display text-base font-bold text-terracota-deep">
                  ${p.price.toLocaleString("es-AR")}
                </p>
                <div className="mt-1.5">
                  <Chip tone={STATUS_TONES[p.status]}>{STATUS_LABELS[p.status] ?? p.status}</Chip>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ButtonLink href={`/mis-publicaciones/${p.id}/editar`} variant="ghost" size="sm">
                    Editar
                  </ButtonLink>
                  {p.status === "active" && (
                    <form action={pauseProduct}>
                      <input type="hidden" name="product_id" value={p.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Pausar
                      </Button>
                    </form>
                  )}
                  {p.status === "paused" && (
                    <form action={reactivateProduct}>
                      <input type="hidden" name="product_id" value={p.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Reactivar
                      </Button>
                    </form>
                  )}
                  {(p.status === "active" || p.status === "paused") && (
                    <>
                      <form action={markAsSold}>
                        <input type="hidden" name="product_id" value={p.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          Marcar vendido
                        </Button>
                      </form>
                      <form action={removeProduct}>
                        <input type="hidden" name="product_id" value={p.id} />
                        <ConfirmButton
                          confirmMessage={`¿Seguro que querés eliminar "${p.title}"? No se puede deshacer.`}
                          size="sm"
                        >
                          Eliminar
                        </ConfirmButton>
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
