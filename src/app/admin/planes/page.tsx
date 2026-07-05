import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { PublicationPlan } from "@/types/database";
import { updatePlan } from "./actions";

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
      <h1 className="text-xl font-semibold mb-6">Planes de publicación</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {saved && <p className="mb-4 text-sm text-green-600">Plan actualizado.</p>}

      <ul className="flex flex-col gap-6">
        {plans?.map((plan) => (
          <li key={plan.id} className="border rounded p-4">
            <p className="font-medium mb-1">{plan.name}</p>
            <p className="text-xs text-gray-500 mb-3">
              Canal: {plan.channel} — Tipo: {plan.type}
            </p>
            <form action={updatePlan} className="flex flex-col gap-3">
              <input type="hidden" name="plan_id" value={plan.id} />
              <label className="text-sm">
                Precio
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={plan.price ?? ""}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Duración (días)
                <input
                  name="duration_days"
                  type="number"
                  min="0"
                  defaultValue={plan.duration_days ?? ""}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Máximo de publicaciones activas (vacío = sin límite)
                <input
                  name="max_active_listings"
                  type="number"
                  min="0"
                  defaultValue={plan.max_active_listings ?? ""}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Máximo de fotos
                <input
                  name="max_photos"
                  type="number"
                  min="0"
                  defaultValue={plan.max_photos ?? ""}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Comisión (%)
                <input
                  name="commission_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  defaultValue={plan.commission_percentage ?? ""}
                  className="mt-1 w-full border rounded px-3 py-2"
                />
              </label>
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" name="active" defaultChecked={plan.active} />
                Activo
              </label>
              <button type="submit" className="bg-black text-white rounded px-3 py-2">
                Guardar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
