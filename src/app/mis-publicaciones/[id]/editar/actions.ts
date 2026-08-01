"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSelectableLeaf } from "@/lib/categories";

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
  const originalPriceRaw = String(formData.get("original_price") ?? "").trim();

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

  // Solo hojas activas (Fase G) — mismo respaldo que en createProduct.
  if (!(await isSelectableLeaf(supabase, categoryId))) {
    redirect(
      `/mis-publicaciones/${productId}/editar?error=${encodeURIComponent("Elegí una categoría válida")}`,
    );
  }

  // Leer estado actual de original_price y price para la lógica de oferta.
  const { data: current } = await supabase
    .from("products")
    .select("price, original_price")
    .eq("id", productId)
    .eq("seller_id", user.id)
    .maybeSingle<{ price: number; original_price: number | null }>();

  if (!current) {
    redirect(
      `/mis-publicaciones/${productId}/editar?error=${encodeURIComponent("Producto no encontrado")}`,
    );
  }

  // Rama A/B: el vendedor ingresó un valor en el campo.
  // Rama C: el campo llegó vacío (no lo tocó, o borró el valor pre-populado).
  let originalPriceToSave: number | null;

  if (originalPriceRaw !== "") {
    const parsed = Number(originalPriceRaw);
    if (Number.isNaN(parsed) || parsed <= 0) {
      redirect(
        `/mis-publicaciones/${productId}/editar?error=${encodeURIComponent("Precio anterior inválido")}`,
      );
    }
    if (parsed <= price) {
      redirect(
        `/mis-publicaciones/${productId}/editar?error=${encodeURIComponent("El precio anterior debe ser mayor al precio actual")}`,
      );
    }
    // Rama B: valor explícito válido.
    originalPriceToSave = parsed;
  } else {
    // Rama C: campo vacío.
    // Si el producto no tenía original_price y el precio bajó → autocomplete.
    // En cualquier otro caso (incluyendo "usuario borró el valor pre-populado") → null.
    if (current.original_price === null && price < current.price) {
      originalPriceToSave = current.price;
    } else {
      originalPriceToSave = current.original_price ?? null;
    }
  }

  const { error } = await supabase
    .from("products")
    .update({
      title,
      description,
      price,
      original_price: originalPriceToSave,
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
