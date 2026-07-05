"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProductStatus } from "@/types/database";

async function updateOwnProductStatus(
  formData: FormData,
  status: Extract<ProductStatus, "active" | "paused" | "sold" | "removed">,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const productId = Number(formData.get("product_id"));
  await supabase
    .from("products")
    .update({ status })
    .eq("id", productId)
    .eq("seller_id", user.id);

  revalidatePath("/mis-publicaciones");
}

export async function pauseProduct(formData: FormData) {
  await updateOwnProductStatus(formData, "paused");
}

export async function reactivateProduct(formData: FormData) {
  await updateOwnProductStatus(formData, "active");
}

export async function markAsSold(formData: FormData) {
  await updateOwnProductStatus(formData, "sold");
}

export async function removeProduct(formData: FormData) {
  await updateOwnProductStatus(formData, "removed");
}
