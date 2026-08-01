import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { Alert } from "@/components/ui/Alert";
import { Chip } from "@/components/ui/Chip";
import { DisputeForm } from "./DisputeForm";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:   "Pendiente de pago",
  paid:      "Pagado",
  delivered: "Entregado",
  disputed:  "En disputa",
  refunded:  "Reembolsado",
  resolved:  "Resuelto",
};

const ORDER_STATUS_TONES: Record<string, "terra" | "azul" | "menta" | "line"> = {
  pending:   "line",
  paid:      "azul",
  delivered: "menta",
  disputed:  "terra",
  refunded:  "line",
  resolved:  "menta",
};

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  open:          "Disputa abierta",
  in_review:     "En revisión",
  resolved:      "Resuelta",
  refunded:      "Reembolsada",
  refund_failed: "Reembolso en proceso",
};

// Estados donde tiene sentido dejar (o ya haber dejado) una reseña.
const REVIEWABLE_STATUSES = new Set(["paid", "delivered", "disputed", "resolved", "refunded"]);

type OrderRow = {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  // Snapshot guardado al momento de la compra (puede ser null en órdenes históricas)
  product_title: string | null;
  product_photo_path: string | null;
  // Join vivo — fallback para órdenes históricas sin snapshot
  products: {
    id: number;
    title: string;
    product_photos: { storage_path: string; is_primary: boolean }[];
  } | null;
  disputes: { id: number; status: string } | null;
  reviews: { id: number } | null;
};

export default async function MyPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `id, amount, status, created_at,
       product_title, product_photo_path,
       products(id, title, product_photos(storage_path, is_primary)),
       disputes(id, status),
       reviews(id)`,
    )
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">Mis compras</h1>

      {ok === "disputa" && (
        <Alert variant="ok">
          Tu reporte fue enviado. Vamos a revisarlo y te vamos a avisar.
        </Alert>
      )}
      {error && <Alert variant="err">{decodeURIComponent(error)}</Alert>}

      {(!orders || orders.length === 0) && (
        <p className="text-sm text-ink-soft">Todavía no realizaste ninguna compra.</p>
      )}

      <ul className="flex flex-col gap-4">
        {orders?.map((order) => {
          // Snapshot → fallback a join vivo → fallback a texto genérico
          const title =
            order.product_title ??
            order.products?.title ??
            "Producto eliminado";

          const photoPath =
            order.product_photo_path ??
            (order.products?.product_photos?.find((p) => p.is_primary) ??
             order.products?.product_photos?.[0])?.storage_path ??
            null;

          const productId = order.products?.id ?? null;

          const canDispute =
            (order.status === "paid" || order.status === "delivered") &&
            !order.disputes;

          const canReview = REVIEWABLE_STATUSES.has(order.status) && productId !== null;
          const alreadyReviewed = order.reviews !== null;

          return (
            <li
              key={order.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {photoPath ? (
                  <Image
                    src={getPublicStorageUrl("product-photos", photoPath)}
                    alt={title}
                    width={80}
                    height={80}
                    className="rounded-md border border-border object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-border text-xs text-ink-soft">
                    Sin foto
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{title}</p>
                  <p className="mt-0.5 font-display text-base font-bold text-terracota-deep">
                    ${order.amount.toLocaleString("es-AR")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {new Date(order.created_at).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip tone={ORDER_STATUS_TONES[order.status] ?? "line"}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Chip>
                    {order.disputes && (
                      <Chip tone="terra">
                        {DISPUTE_STATUS_LABELS[order.disputes.status] ?? order.disputes.status}
                      </Chip>
                    )}
                  </div>

                  {order.disputes?.status === "refund_failed" && (
                    <p className="mt-2 text-xs text-ink-soft">
                      Tu reembolso está siendo procesado. Te vamos a avisar en cuanto se acredite.
                    </p>
                  )}

                  {/* Reseña */}
                  {canReview && (
                    <div className="mt-3">
                      {alreadyReviewed ? (
                        <p className="text-xs text-ink-soft">Ya dejaste tu opinión.</p>
                      ) : (
                        <Link
                          href={`/productos/${productId}#resenas`}
                          className="text-sm font-medium text-azul-deep underline hover:no-underline"
                        >
                          Dejar tu opinión
                        </Link>
                      )}
                    </div>
                  )}

                  {canDispute && <DisputeForm orderId={order.id} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
