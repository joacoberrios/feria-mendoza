"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function productPath(productId: number) {
  return `/productos/${productId}`;
}

export async function createReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orderId = Number(formData.get("order_id"));
  const sellerId = String(formData.get("seller_id") ?? "");
  const productId = Number(formData.get("product_id"));
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!orderId || !sellerId || !productId || rating < 1 || rating > 5) {
    redirect(`${productPath(productId)}?review_error=${encodeURIComponent("Datos inválidos")}`);
  }

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    reviewer_id: user.id,
    seller_id: sellerId,
    rating,
    comment,
  });

  if (error) {
    const msg =
      error.code === "23505"
        ? "Ya dejaste una reseña para esta compra"
        : error.message;
    redirect(`${productPath(productId)}?review_error=${encodeURIComponent(msg)}`);
  }

  revalidatePath(productPath(productId));
  redirect(`${productPath(productId)}?review_ok=1`);
}

export async function updateReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reviewId = Number(formData.get("review_id"));
  const productId = Number(formData.get("product_id"));
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim() || null;

  if (!reviewId || !productId || rating < 1 || rating > 5) {
    redirect(`${productPath(productId)}?review_error=${encodeURIComponent("Datos inválidos")}`);
  }

  const { error } = await supabase
    .from("reviews")
    .update({ rating, comment })
    .eq("id", reviewId)
    .eq("reviewer_id", user.id);

  if (error) {
    redirect(`${productPath(productId)}?review_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(productPath(productId));
  redirect(productPath(productId));
}

export async function respondToReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reviewId = Number(formData.get("review_id"));
  const productId = Number(formData.get("product_id"));
  const sellerResponse = String(formData.get("seller_response") ?? "").trim() || null;

  if (!reviewId || !productId) {
    redirect(`${productPath(productId)}?review_error=${encodeURIComponent("Datos inválidos")}`);
  }

  const { error } = await supabase
    .from("reviews")
    .update({ seller_response: sellerResponse })
    .eq("id", reviewId)
    .eq("seller_id", user.id);

  if (error) {
    redirect(`${productPath(productId)}?review_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(productPath(productId));
  redirect(productPath(productId));
}
