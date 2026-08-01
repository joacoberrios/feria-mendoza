import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { Alert } from "@/components/ui/Alert";
import { SaleForm } from "./SaleForm";
import { deleteInstagramSale } from "./actions";

type Sale = {
  id: number;
  seller_name: string;
  seller_contact: string;
  amount: number;
  notes: string | null;
  created_at: string;
  publication_plans: { name: string } | null;
  users: { first_name: string | null; last_name: string | null } | null;
};

export default async function AdminVentasInstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const supabase = await createClient();

  const [{ data: plans }, { data: sales }] = await Promise.all([
    supabase
      .from("publication_plans")
      .select("id, name, price")
      .eq("channel", "instagram")
      .eq("active", true)
      .order("name"),
    supabase
      .from("instagram_sales")
      .select(
        "id, seller_name, seller_contact, amount, notes, created_at, publication_plans(name), users!instagram_sales_registered_by_fkey(first_name, last_name)",
      )
      .order("created_at", { ascending: false })
      .returns<Sale[]>(),
  ]);

  const igPlans = (plans ?? []) as { id: number; name: string; price: number | null }[];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">
        Ventas Plan Instagram
      </h1>

      {ok === "1" && <Alert variant="ok">Venta registrada correctamente.</Alert>}
      {ok === "eliminado" && <Alert variant="ok">Registro eliminado.</Alert>}
      {error && <Alert variant="err">{decodeURIComponent(error)}</Alert>}

      {igPlans.length === 0 ? (
        <Alert variant="err">
          No hay planes de Instagram activos. Activá al menos uno desde{" "}
          <a href="/admin/planes" className="underline">
            Planes
          </a>
          .
        </Alert>
      ) : (
        <SaleForm plans={igPlans} />
      )}

      <section className="mt-10">
        <h2 className="mb-4 font-semibold text-ink">
          Historial de ventas
          {sales && sales.length > 0 && (
            <span className="ml-2 text-sm font-normal text-ink-soft">
              ({sales.length})
            </span>
          )}
        </h2>

        {(!sales || sales.length === 0) && (
          <p className="text-sm text-ink-soft">No hay ventas registradas todavía.</p>
        )}

        <ul className="flex flex-col gap-4">
          {sales?.map((sale) => {
            const registeredBy = sale.users
              ? [sale.users.first_name, sale.users.last_name]
                  .filter(Boolean)
                  .join(" ") || "Admin"
              : "Admin";

            return (
              <li
                key={sale.id}
                className="rounded-lg border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink">{sale.seller_name}</p>
                    <p className="text-sm text-ink-soft">{sale.seller_contact}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
                      <span>
                        Plan:{" "}
                        <span className="text-ink">
                          {sale.publication_plans?.name ?? "—"}
                        </span>
                      </span>
                      <span>
                        Monto:{" "}
                        <span className="text-ink font-medium">
                          ${Number(sale.amount).toLocaleString("es-AR")}
                        </span>
                      </span>
                    </div>
                    {sale.notes && (
                      <p className="mt-1 text-sm text-ink-soft italic">
                        {sale.notes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-ink-soft">
                      Registrado por {registeredBy} el{" "}
                      {new Date(sale.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <form action={deleteInstagramSale}>
                    <input type="hidden" name="sale_id" value={sale.id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded px-2 py-1 text-xs text-ink-soft hover:bg-bg-subtle hover:text-carmin focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-malbec"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
