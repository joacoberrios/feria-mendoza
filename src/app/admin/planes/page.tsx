import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { PublicationPlan } from "@/types/database";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { updatePlan } from "./actions";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-malbec";

export default async function AdminPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("publication_plans")
    .select("*")
    .order("channel")
    .returns<PublicationPlan[]>();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">Planes de publicación</h1>

      {error && <Alert variant="err">{decodeURIComponent(error)}</Alert>}
      {saved && <Alert variant="ok">Plan actualizado.</Alert>}

      <ul className="flex flex-col gap-6 mt-2">
        {plans?.map((plan) => (
          <li key={plan.id} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <p className="font-semibold text-ink">{plan.name}</p>
            <p className="text-xs text-ink-soft mt-0.5 mb-4">
              Canal: {plan.channel} — Tipo: {plan.type}
            </p>

            <form action={updatePlan} className="flex flex-col gap-4">
              <input type="hidden" name="plan_id" value={plan.id} />

              <label className="flex flex-col text-sm font-medium text-ink">
                Precio
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={plan.price ?? ""}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-ink">
                Duración (días)
                <input
                  name="duration_days"
                  type="number"
                  min="0"
                  defaultValue={plan.duration_days ?? ""}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-ink">
                Máximo de publicaciones activas{" "}
                <span className="font-normal text-ink-soft">(vacío = sin límite)</span>
                <input
                  name="max_active_listings"
                  type="number"
                  min="0"
                  defaultValue={plan.max_active_listings ?? ""}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-ink">
                Máximo de fotos
                <input
                  name="max_photos"
                  type="number"
                  min="0"
                  defaultValue={plan.max_photos ?? ""}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-ink">
                Comisión (%)
                <input
                  name="commission_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={plan.commission_percentage ?? ""}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" name="active" defaultChecked={plan.active} className="accent-malbec" />
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
