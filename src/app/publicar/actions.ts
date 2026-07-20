"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { MAX_PRODUCT_PHOTOS, MAX_PRODUCT_PHOTO_SIZE_BYTES } from "@/lib/product-photo";
import { isSelectableLeaf } from "@/lib/categories";

const ALLOWED_CONDITIONS = ["nuevo", "como_nuevo", "usado"];

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
  const categoryId = Number(formData.get("category_id"));
  const zoneId = Number(formData.get("zone_id"));
  const condition = String(formData.get("condition") ?? "");
  const primarySlot = Number(formData.get("primary_slot") ?? "1");

  if (
    !title ||
    !description ||
    !ALLOWED_CONDITIONS.includes(condition) ||
    Number.isNaN(price) ||
    Number.isNaN(categoryId) ||
    Number.isNaN(zoneId)
  ) {
    redirect(`/publicar?error=${encodeURIComponent("Completá todos los campos requeridos")}`);
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

  // Solo hojas activas: un padre (Mujer/Hombre/Kids) o una categoría
  // desactivada no son válidos aunque alguien fuerce el form.
  if (!(await isSelectableLeaf(supabase, categoryId))) {
    redirect(`/publicar?error=${encodeURIComponent("Elegí una categoría válida")}`);
  }

  // El canal Web/App no cobra por publicar (100% comisión, cobrada recién
  // en Fase 4 vía split de Mercado Pago al momento de la venta), así que
  // el producto pasa directo a 'active' y queda asociado al plan de
  // comisión web.
  const { data: webPlan } = await supabase
    .from("publication_plans")
    .select("id")
    .eq("channel", "web")
    .eq("active", true)
    .maybeSingle();

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert({
      seller_id: profile.id,
      title,
      description,
      price,
      category_id: categoryId,
      zone_id: zoneId,
      condition,
      status: "active",
      plan_id: webPlan?.id ?? null,
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
