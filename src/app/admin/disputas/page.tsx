import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { Chip } from "@/components/ui/Chip";
import { ResolveForm } from "./ResolveForm";
import { markInReview } from "./actions";
import { Button } from "@/components/ui/Button";

const REASON_LABELS: Record<string, string> = {
  no_llego:          "No llegó",
  no_es_lo_comprado: "No es lo que compré",
  llego_daniado:     "Llegó dañado",
  otro:              "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  open:          "Abierta",
  in_review:     "En revisión",
  resolved:      "Resuelta",
  refunded:      "Reembolsada",
  refund_failed: "Reembolso fallido",
};

const STATUS_TONES: Record<string, "terra" | "azul" | "menta" | "line"> = {
  open:          "terra",
  in_review:     "azul",
  resolved:      "menta",
  refunded:      "menta",
  refund_failed: "terra",
};

type DisputeRow = {
  id: number;
  reason: string;
  comment: string | null;
  status: string;
  resolution_notes: string | null;
  mp_refund_id: string | null;
  created_at: string;
  resolved_at: string | null;
  orders: {
    id: number;
    amount: number;
    mp_payment_id: string | null;
    status: string;
    products: { id: number; title: string } | null;
  } | null;
  opener: { first_name: string | null; last_name: string | null; email: string } | null;
};

export default async function AdminDisputasPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const supabase = await createClient();

  const { data: disputes } = await supabase
    .from("disputes")
    .select(
      `id, reason, comment, status, resolution_notes, mp_refund_id, created_at, resolved_at,
       orders(id, amount, mp_payment_id, status, products(id, title)),
       opener:users!disputes_opened_by_fkey(first_name, last_name, email)`,
    )
    .not("status", "in", '("resolved","refunded")')
    .order("created_at");

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">Disputas</h1>

      {(!disputes || disputes.length === 0) && (
        <p className="text-sm text-ink-soft">No hay disputas activas.</p>
      )}

      <ul className="flex flex-col gap-6">
        {(disputes as unknown as DisputeRow[])?.map((d) => {
          const order = d.orders;
          const opener = d.opener;
          const buyerName = opener
            ? [opener.first_name, opener.last_name].filter(Boolean).join(" ") || opener.email
            : "—";

          return (
            <li key={d.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{order?.products?.title ?? "Producto eliminado"}</p>
                  <p className="text-sm text-ink-soft">
                    Comprador: <span className="font-medium text-ink">{buyerName}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    Monto:{" "}
                    <span className="font-medium text-ink">
                      ${order?.amount.toLocaleString("es-AR") ?? "—"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Abierta:{" "}
                    {new Date(d.created_at).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Chip tone={STATUS_TONES[d.status] ?? "line"}>
                  {STATUS_LABELS[d.status] ?? d.status}
                </Chip>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Chip tone="line">{REASON_LABELS[d.reason] ?? d.reason}</Chip>
              </div>

              {d.comment && (
                <p className="mt-2 text-sm text-ink-soft italic">&quot;{d.comment}&quot;</p>
              )}

              {d.resolution_notes && (
                <div className="mt-3 rounded-md bg-bg-subtle px-3 py-2">
                  <p className="text-xs font-semibold text-ink-soft mb-1">Notas internas</p>
                  <p className="text-sm text-ink-soft whitespace-pre-wrap">{d.resolution_notes}</p>
                </div>
              )}

              {d.mp_refund_id && (
                <p className="mt-2 text-xs text-ink-soft">
                  ID reembolso MP: <span className="font-mono">{d.mp_refund_id}</span>
                </p>
              )}

              {/* Pasar a "En revisión" si está abierta */}
              {d.status === "open" && (
                <form action={markInReview} className="mt-3">
                  <input type="hidden" name="dispute_id" value={d.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    Marcar en revisión
                  </Button>
                </form>
              )}

              <ResolveForm
                disputeId={d.id}
                orderId={order?.id ?? 0}
                amount={order?.amount ?? 0}
                status={d.status}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
