"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_CONDITIONS = ["nuevo", "como_nuevo", "usado"];

export async function updateProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const productId = Number(formData.get("product_id"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price"));
  const categoryId = Number(formData.get("category_id"));
  const zoneId = Number(formData.get("zone_id"));
  const condition = String(formData.get("condition") ?? "");

  if (
    !title ||
    !description ||
    !ALLOWED_CONDITIONS.includes(condition) ||
    Number.isNaN(price) ||
    Number.isNaN(categoryId) ||
    Number.isNaN(zoneId)
  ) {
    redirect(
      `/mis-publicaciones/${productId}/editar?error=${encodeURIComponent("Completá todos los campos requeridos")}`,
    );
  }

  const { error } = await supabase
    .from("products")
    .update({
      title,
      description,
      price,
      category_id: categoryId,
      zone_id: zoneId,
      condition,
    })
    .eq("id", productId)
    .eq("seller_id", user.id);

  if (error) {
    redirect(
      `/mis-publicaciones/${productId}/editar?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/mis-publicaciones/${productId}/editar?saved=1`);
}
