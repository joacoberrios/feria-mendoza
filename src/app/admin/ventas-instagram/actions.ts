"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function registerInstagramSale(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const sellerName = String(formData.get("seller_name") ?? "").trim();
  const sellerContact = String(formData.get("seller_contact") ?? "").trim();
  const planId = Number(formData.get("plan_id"));
  const amount = parseFloat(String(formData.get("amount") ?? ""));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!sellerName || !sellerContact || !planId || isNaN(amount) || amount <= 0) {
    redirect("/admin/ventas-instagram?error=Completá+todos+los+campos+requeridos");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("instagram_sales").insert({
    seller_name: sellerName,
    seller_contact: sellerContact,
    plan_id: planId,
    amount,
    notes,
    registered_by: profile.id,
  });

  if (error) {
    console.error("[instagram-sales:register]", error);
    redirect(
      `/admin/ventas-instagram?error=${encodeURIComponent("Error al guardar la venta. Intentá de nuevo.")}`,
    );
  }

  redirect("/admin/ventas-instagram?ok=1");
}

export async function deleteInstagramSale(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const saleId = Number(formData.get("sale_id"));
  if (!saleId) redirect("/admin/ventas-instagram");

  const supabase = await createClient();
  const { error } = await supabase
    .from("instagram_sales")
    .delete()
    .eq("id", saleId);

  if (error) {
    console.error("[instagram-sales:delete]", error);
    redirect(
      `/admin/ventas-instagram?error=${encodeURIComponent("Error al eliminar el registro.")}`,
    );
  }

  redirect("/admin/ventas-instagram?ok=eliminado");
}
