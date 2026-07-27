"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";

const VALID_REASONS = ["no_llego", "no_es_lo_comprado", "llego_daniado", "otro"] as const;
type DisputeReason = (typeof VALID_REASONS)[number];

export async function openDispute(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orderId = Number(formData.get("order_id"));
  const reason = String(formData.get("reason") ?? "") as DisputeReason;
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!orderId || !VALID_REASONS.includes(reason)) {
    redirect("/mis-compras?error=Datos+inválidos");
  }

  const supabase = await createClient();

  // Verificar que la orden pertenece al usuario y está en estado disputable.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("buyer_id", profile.id)
    .in("status", ["paid", "delivered"])
    .maybeSingle();

  if (!order) {
    redirect("/mis-compras?error=Orden+no+encontrada+o+no+se+puede+disputar");
  }

  const admin = createAdminClient();

  const { error: disputeError } = await admin.from("disputes").insert({
    order_id: orderId,
    opened_by: profile.id,
    reason,
    comment,
  });

  if (disputeError) {
    if (disputeError.code === "23505") {
      redirect("/mis-compras?error=Ya+existe+una+disputa+para+esta+orden");
    }
    redirect("/mis-compras?error=No+pudimos+abrir+la+disputa");
  }

  await admin.from("orders").update({ status: "disputed" }).eq("id", orderId);

  revalidatePath("/mis-compras");
  redirect("/mis-compras?ok=disputa");
}
