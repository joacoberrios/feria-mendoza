import Image from "next/image";
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

type OrderRow = {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  products: {
    id: number;
    title: string;
    product_photos: { storage_path: string; is_primary: boolean }[];
  } | null;
  disputes: { id: number; status: string } | null;
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
      "id, amount, status, created_at, products(id, title, product_photos(storage_path, is_primary)), disputes(id, status)",
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
          const product = order.products;
          const primaryPhoto = product?.product_photos?.find((p) => p.is_primary)
            ?? product?.product_photos?.[0];
          const canDispute =
            (order.status === "paid" || order.status === "delivered") &&
            !order.disputes;

          return (
            <li
              key={order.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {primaryPhoto ? (
                  <Image
                    src={getPublicStorageUrl("product-photos", primaryPhoto.storage_path)}
                    alt={product?.title ?? "Producto"}
                    width={80}
                    height={80}
                    className="rounded-md border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-border text-xs text-ink-soft">
                    Sin foto
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">
                    {product?.title ?? "Producto eliminado"}
                  </p>
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

                  {/* Mensaje al comprador cuando el reembolso está en proceso
                      (puede estar fallido internamente, pero nunca le mostramos eso) */}
                  {order.disputes?.status === "refund_failed" && (
                    <p className="mt-2 text-xs text-ink-soft">
                      Tu reembolso está siendo procesado. Te vamos a avisar en cuanto se acredite.
                    </p>
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
