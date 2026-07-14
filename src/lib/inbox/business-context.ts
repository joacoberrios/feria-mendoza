import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

// Arma la descripción del plan "Historias Destacadas" para el prompt de
// clasificación leyendo el precio/condiciones vigentes de
// publication_plans en vez de tenerlos hardcodeados en el prompt — si
// se cambia el precio desde /admin/planes, el borrador de la IA lo
// refleja solo, sin tocar código.
export async function getFeaturedStoriesPlanDescription(admin: AdminClient): Promise<string> {
  const { data: plan } = await admin
    .from("publication_plans")
    .select("price, duration_days, max_photos")
    .eq("channel", "instagram")
    .eq("type", "fixed_fee")
    .eq("active", true)
    .maybeSingle<{ price: number | null; duration_days: number | null; max_photos: number | null }>();

  if (!plan) {
    return "el plan de Historias Destacadas (no encontré el precio vigente en el sistema — no inventes un monto, decile que te confirmás el precio actual)";
  }

  const price = plan.price != null ? `$${Number(plan.price).toLocaleString("es-AR")}` : "un precio a confirmar";
  const photos = plan.max_photos ?? "varias";
  const days = plan.duration_days ?? 30;

  return `el vendedor paga ${price} por publicar hasta ${photos} fotos de productos distintos en historias, que quedan como historias destacadas del perfil durante ${days} días`;
}
