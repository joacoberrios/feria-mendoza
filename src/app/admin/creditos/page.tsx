import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { createPackage, updatePackage } from "./actions";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-malbec";

type CreditPackage = {
  id: number;
  name: string;
  credits: number;
  price: number;
  expiration_days: number;
  active: boolean;
};

export default async function AdminCreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const supabase = await createClient();
  // El admin puede ver todos los paquetes (activos e inactivos) por la
  // política "Admins can view all packages".
  const { data: packages } = await supabase
    .from("credit_packages")
    .select("id, name, credits, price, expiration_days, active")
    .order("price", { ascending: true })
    .returns<CreditPackage[]>();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">Paquetes de créditos</h1>

      {ok === "created" && <Alert variant="ok">Paquete creado.</Alert>}
      {ok === "updated" && <Alert variant="ok">Paquete actualizado.</Alert>}
      {error && <Alert variant="err">{decodeURIComponent(error)}</Alert>}

      {/* Crear paquete nuevo */}
      <div className="mb-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-ink">Nuevo paquete</h2>
        <form action={createPackage} className="flex flex-col gap-4">
          <label className="flex flex-col text-sm font-medium text-ink">
            Nombre
            <input
              name="name"
              type="text"
              required
              placeholder="Ej: Pack 5 créditos"
              className={INPUT_CLASS}
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col text-sm font-medium text-ink">
              Créditos
              <input name="credits" type="number" min="1" required className={INPUT_CLASS} />
            </label>
            <label className="flex flex-col text-sm font-medium text-ink">
              Precio ($)
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-ink">
              Vigencia (días)
              <input
                name="expiration_days"
                type="number"
                min="1"
                required
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <Button type="submit" className="self-start">
            Crear paquete
          </Button>
        </form>
      </div>

      {/* Paquetes existentes */}
      {(!packages || packages.length === 0) && (
        <p className="text-sm text-ink-soft">No hay paquetes creados todavía.</p>
      )}

      <ul className="flex flex-col gap-6">
        {packages?.map((pkg) => (
          <li key={pkg.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <p className="font-semibold text-ink">{pkg.name}</p>
            <p className="mb-4 mt-0.5 text-xs text-ink-soft">
              {pkg.credits} crédito{pkg.credits !== 1 ? "s" : ""} · $
              {Number(pkg.price).toLocaleString("es-AR")} · {pkg.expiration_days} días ·{" "}
              {pkg.active ? "Activo" : "Inactivo"}
            </p>

            <form action={updatePackage} className="flex flex-col gap-4">
              <input type="hidden" name="package_id" value={pkg.id} />

              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col text-sm font-medium text-ink">
                  Créditos
                  <input
                    name="credits"
                    type="number"
                    min="1"
                    defaultValue={pkg.credits}
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-ink">
                  Precio ($)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={pkg.price}
                    className={INPUT_CLASS}
                  />
                </label>
                <label className="flex flex-col text-sm font-medium text-ink">
                  Vigencia (días)
                  <input
                    name="expiration_days"
                    type="number"
                    min="1"
                    defaultValue={pkg.expiration_days}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={pkg.active}
                  className="accent-malbec"
                />
                Activo
              </label>

              <Button type="submit" className="self-start">
                Guardar
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
