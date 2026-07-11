"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidSellerAccessToken } from "@/lib/mercadopago/tokens";
import { createCheckoutPreference } from "@/lib/mercadopago/preferences";
import { getSiteUrl } from "@/lib/site-url";

const DEFAULT_COMMISSION_PERCENTAGE = 20;

export async function createCheckout(formData: FormData) {
  const productId = Number(formData.get("product_id"));
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: product } = await supabase
    .from("products")
    .select("id, title, price, seller_id, status, plan_id, publication_plans(commission_percentage)")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle<{
      id: number;
      title: string;
      price: number;
      seller_id: string;
      status: string;
      plan_id: number | null;
      publication_plans: { commission_percentage: number | null } | null;
    }>();

  if (!product) {
    redirect(`/productos/${productId}?error=${encodeURIComponent("Este producto ya no está disponible.")}`);
  }

  if (product.seller_id === user.id) {
    redirect(`/productos/${productId}?error=${encodeURIComponent("No podés comprar tu propia publicación.")}`);
  }

  const sellerAccessToken = await getValidSellerAccessToken(product.seller_id);
  if (!sellerAccessToken) {
    redirect(
      `/productos/${productId}?error=${encodeURIComponent("El vendedor todavía no conectó Mercado Pago, no se puede comprar este producto.")}`,
    );
  }

  const commissionPercentage =
    product.publication_plans?.commission_percentage ?? DEFAULT_COMMISSION_PERCENTAGE;
  const commissionAmount = Math.round(product.price * (commissionPercentage / 100) * 100) / 100;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      product_id: product.id,
      buyer_id: user.id,
      seller_id: product.seller_id,
      amount: product.price,
      commission_amount: commissionAmount,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    redirect(
      `/productos/${productId}?error=${encodeURIComponent(orderError?.message ?? "No pudimos iniciar la compra.")}`,
    );
  }

  const siteUrl = await getSiteUrl();

  // redirect() lanza una excepción especial de Next para hacer el
  // redirect — si quedara dentro del try/catch de abajo, este catch la
  // interceptaría como si fuera un error real. Por eso la creación de la
  // preferencia va en su propio try/catch y el redirect final queda afuera.
  let sandboxInitPoint: string;
  try {
    const preference = await createCheckoutPreference({
      sellerAccessToken,
      orderId: order.id,
      productTitle: product.title,
      unitPrice: product.price,
      marketplaceFee: commissionAmount,
      siteUrl,
    });

    const admin = createAdminClient();
    await admin.from("orders").update({ mp_preference_id: preference.id }).eq("id", order.id);

    sandboxInitPoint = preference.sandbox_init_point;
  } catch (err) {
    console.error("[mercadopago:checkout] error creando la preferencia:", err);
    redirect(
      `/productos/${productId}?error=${encodeURIComponent("No pudimos iniciar el pago con Mercado Pago.")}`,
    );
  }

  redirect(sandboxInitPoint);
}
