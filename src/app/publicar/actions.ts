"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { MAX_PRODUCT_PHOTOS, MAX_PRODUCT_PHOTO_SIZE_BYTES } from "@/lib/product-photo";
import { isSelectableLeaf } from "@/lib/categories";

const ALLOWED_CONDITIONS = ["nuevo", "como_nuevo", "usado"];
const ALLOWED_MODES = ["commission", "credit"] as const;
type PublicationMode = (typeof ALLOWED_MODES)[number];

export async function createProduct(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.verification_status !== "approved") {
    redirect(
      `/verificacion?error=${encodeURIComponent("Necesitás verificar tu identidad antes de publicar productos.")}`,
    );
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price"));
  const originalPriceRaw = String(formData.get("original_price") ?? "").trim();
  const originalPrice = originalPriceRaw !== "" ? Number(originalPriceRaw) : null;
  const categoryId = Number(formData.get("category_id"));
  const zoneId = Number(formData.get("zone_id"));
  const condition = String(formData.get("condition") ?? "");
  const primarySlot = Number(formData.get("primary_slot") ?? "1");
  const publicationMode = String(formData.get("publication_mode") ?? "commission") as PublicationMode;

  if (
    !title ||
    !description ||
    !ALLOWED_CONDITIONS.includes(condition) ||
    !ALLOWED_MODES.includes(publicationMode) ||
    Number.isNaN(price) ||
    Number.isNaN(categoryId) ||
    Number.isNaN(zoneId)
  ) {
    redirect(`/publicar?error=${encodeURIComponent("Completá todos los campos requeridos")}`);
  }

  if (originalPrice !== null && (Number.isNaN(originalPrice) || originalPrice <= price)) {
    redirect(`/publicar?error=${encodeURIComponent("El precio anterior debe ser mayor al precio actual")}`);
  }

  const slotFiles: { slot: number; file: File }[] = [];
  for (let slot = 1; slot <= MAX_PRODUCT_PHOTOS; slot++) {
    const file = formData.get(`photo_${slot}`);
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PRODUCT_PHOTO_SIZE_BYTES) {
        redirect(`/publicar?error=${encodeURIComponent(`La foto ${slot} supera el máximo de 8MB`)}`);
      }
      slotFiles.push({ slot, file });
    }
  }

  if (slotFiles.length === 0) {
    redirect(`/publicar?error=${encodeURIComponent("Subí al menos una foto")}`);
  }

  const primaryIndex = slotFiles.findIndex((s) => s.slot === primarySlot);
  const resolvedPrimaryIndex = primaryIndex === -1 ? 0 : primaryIndex;

  const supabase = await createClient();

  if (!(await isSelectableLeaf(supabase, categoryId))) {
    redirect(`/publicar?error=${encodeURIComponent("Elegí una categoría válida")}`);
  }

  // Verificar que el plan elegido está activo.
  const planType = publicationMode === "credit" ? "credit" : "commission";
  const { data: plan } = await supabase
    .from("publication_plans")
    .select("id")
    .eq("channel", "web")
    .eq("type", planType)
    .eq("active", true)
    .maybeSingle<{ id: number }>();

  if (!plan) {
    redirect(`/publicar?error=${encodeURIComponent("El plan de publicación no está disponible.")}`);
  }

  // Consumo atómico de crédito (FIFO) si corresponde.
  let creditPurchaseId: number | null = null;
  if (publicationMode === "credit") {
    const { data: consumedId, error: creditError } = await supabase.rpc("consume_one_credit", {
      p_user_id: profile.id,
    });

    if (creditError || consumedId == null) {
      console.error("[publicar:createProduct] error consumiendo crédito:", creditError);
      redirect(`/publicar?error=${encodeURIComponent("No se pudo consumir el crédito. Verificá tu saldo en /creditos.")}`);
    }

    creditPurchaseId = consumedId as number;
  }

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      seller_id: profile.id,
      title,
      description,
      price,
      original_price: originalPrice,
      category_id: categoryId,
      zone_id: zoneId,
      condition,
      status: "active",
      plan_id: plan.id,
      credit_purchase_id: creditPurchaseId,
    })
    .select("id")
    .single();

  if (insertError || !product) {
    redirect(
      `/publicar?error=${encodeURIComponent(insertError?.message ?? "No se pudo crear el producto")}`,
    );
  }

  for (let i = 0; i < slotFiles.length; i++) {
    const { file } = slotFiles[i];
    const extension = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/${product.id}/${i + 1}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-photos")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      redirect(`/publicar?error=${encodeURIComponent(uploadError.message)}`);
    }

    await supabase.from("product_photos").insert({
      product_id: product.id,
      storage_path: path,
      is_primary: i === resolvedPrimaryIndex,
      position: i,
    });
  }

  redirect("/mis-publicaciones?created=1");
}
