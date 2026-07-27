"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { issueRefund } from "@/lib/mercadopago/refunds";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  return profile;
}

export async function markInReview(formData: FormData) {
  await requireAdmin();
  const disputeId = Number(formData.get("dispute_id"));
  const admin = createAdminClient();
  await admin.from("disputes").update({ status: "in_review" }).eq("id", disputeId);
  revalidatePath("/admin/disputas");
}

export async function resolveWithoutRefund(formData: FormData) {
  await requireAdmin();
  const disputeId = Number(formData.get("dispute_id"));
  const orderId = Number(formData.get("order_id"));
  const notes = String(formData.get("resolution_notes") ?? "").trim() || null;
  const admin = createAdminClient();

  await admin
    .from("disputes")
    .update({ status: "resolved", resolution_notes: notes, resolved_at: new Date().toISOString() })
    .eq("id", disputeId);

  await admin.from("orders").update({ status: "resolved" }).eq("id", orderId);

  revalidatePath("/admin/disputas");
}

export async function resolveWithRefund(formData: FormData) {
  await requireAdmin();
  const disputeId = Number(formData.get("dispute_id"));
  const orderId = Number(formData.get("order_id"));
  const notes = String(formData.get("resolution_notes") ?? "").trim() || null;
  const admin = createAdminClient();

  // Buscar datos de la orden para el reembolso.
  const { data: order } = await admin
    .from("orders")
    .select("mp_payment_id, seller_id, amount, product_id")
    .eq("id", orderId)
    .single();

  if (!order?.mp_payment_id) {
    await admin
      .from("disputes")
      .update({
        status: "refund_failed",
        resolution_notes: "Error: la orden no tiene mp_payment_id registrado.",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);
    revalidatePath("/admin/disputas");
    return;
  }

  const result = await issueRefund(order.mp_payment_id, order.seller_id);

  if (result.ok) {
    await admin
      .from("disputes")
      .update({
        status: "refunded",
        mp_refund_id: result.refundId,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    await admin.from("orders").update({ status: "refunded" }).eq("id", orderId);
    if (order.product_id) {
      await admin.from("products").update({ status: "active" }).eq("id", order.product_id);
    }
  } else {
    const errorNote = `${notes ? notes + "\n\n" : ""}[Intento ${new Date().toISOString()}] Reembolso fallido: ${result.error}`;
    await admin
      .from("disputes")
      .update({
        status: "refund_failed",
        resolution_notes: errorNote,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);
    console.error(`[disputas] reembolso fallido orden ${orderId}:`, result.error);
  }

  revalidatePath("/admin/disputas");
}

export async function retryRefund(formData: FormData) {
  await requireAdmin();
  const disputeId = Number(formData.get("dispute_id"));
  const orderId = Number(formData.get("order_id"));
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("mp_payment_id, seller_id, product_id")
    .eq("id", orderId)
    .single();

  if (!order?.mp_payment_id) {
    revalidatePath("/admin/disputas");
    return;
  }

  const result = await issueRefund(order.mp_payment_id, order.seller_id);

  if (result.ok) {
    await admin
      .from("disputes")
      .update({
        status: "refunded",
        mp_refund_id: result.refundId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    await admin.from("orders").update({ status: "refunded" }).eq("id", orderId);
    if (order.product_id) {
      await admin.from("products").update({ status: "active" }).eq("id", order.product_id);
    }
  } else {
    const { data: dispute } = await admin
      .from("disputes")
      .select("resolution_notes")
      .eq("id", disputeId)
      .single();
    const prevNotes = dispute?.resolution_notes ?? "";
    const errorNote = `${prevNotes}\n\n[Reintento ${new Date().toISOString()}] ${result.error}`.trim();
    await admin
      .from("disputes")
      .update({ status: "refund_failed", resolution_notes: errorNote })
      .eq("id", disputeId);
    console.error(`[disputas] reintento fallido orden ${orderId}:`, result.error);
  }

  revalidatePath("/admin/disputas");
}
