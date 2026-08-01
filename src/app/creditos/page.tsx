import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { buyCreditPackage } from "./actions";

type CreditPurchase = {
  id: number;
  credits_remaining: number;
  expires_at: string;
  credit_packages: { name: string } | null;
};

type CreditPackage = {
  id: number;
  name: string;
  credits: number;
  price: number;
  expiration_days: number;
};

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; pending?: string }>;
}) {
  const { ok, error, pending } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: purchases }, { data: packages }] = await Promise.all([
    supabase
      .from("credit_purchases")
      .select("id, credits_remaining, expires_at, credit_packages(name)")
      .eq("user_id", profile.id)
      .gt("credits_remaining", 0)
      .gt("expires_at", now)
      .order("expires_at", { ascending: true })
      .returns<CreditPurchase[]>(),
    supabase
      .from("credit_packages")
      .select("id, name, credits, price, expiration_days")
      .eq("active", true)
      .order("price", { ascending: true })
      .returns<CreditPackage[]>(),
  ]);

  const totalCredits = (purchases ?? []).reduce((sum, p) => sum + p.credits_remaining, 0);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">Créditos</h1>

      {ok === "1" && (
        <Alert variant="ok">
          ¡Pago recibido! Tus créditos van a aparecer en cuanto Mercado Pago confirme la
          transacción (puede demorar unos segundos — recargá la página si no aparecen).
        </Alert>
      )}
      {pending === "1" && (
        <Alert variant="info">
          Tu pago está siendo procesado. Los créditos se acreditarán automáticamente cuando se
          confirme.
        </Alert>
      )}
      {error && (
        <Alert variant="err">
          {error === "pago_fallido"
            ? "El pago no se completó. Podés intentarlo de nuevo."
            : decodeURIComponent(error)}
        </Alert>
      )}

      {/* Saldo actual */}
      <section className="mb-8">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm text-ink-soft">Créditos disponibles</p>
          <p className="mt-1 font-display text-4xl font-bold text-malbec">
            {totalCredits}
          </p>

          {purchases && purchases.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {purchases.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-ink-soft">
                    {p.credit_packages?.name ?? "Paquete"}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold text-ink">
                      {p.credits_remaining} crédito{p.credits_remaining !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-ink-soft">
                      vence{" "}
                      {new Date(p.expires_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {totalCredits === 0 && (
            <p className="mt-2 text-sm text-ink-soft">
              No tenés créditos activos. Comprá un paquete abajo.
            </p>
          )}
        </div>
      </section>

      {/* Comprar paquetes */}
      <section>
        <h2 className="mb-4 font-display text-base font-semibold">Comprar créditos</h2>

        {(!packages || packages.length === 0) && (
          <p className="text-sm text-ink-soft">No hay paquetes disponibles en este momento.</p>
        )}

        <ul className="flex flex-col gap-4">
          {packages?.map((pkg) => (
            <li
              key={pkg.id}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink">{pkg.name}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {pkg.credits} crédito{pkg.credits !== 1 ? "s" : ""} · vigencia{" "}
                    {pkg.expiration_days} días
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-malbec">
                    ${pkg.price.toLocaleString("es-AR")}
                  </p>
                </div>
                <form action={buyCreditPackage}>
                  <input type="hidden" name="package_id" value={pkg.id} />
                  <Button type="submit" size="sm">
                    Comprar
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
