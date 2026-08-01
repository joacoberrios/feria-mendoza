"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { createCreditPreference } from "@/lib/mercadopago/preferences";
import { getSiteUrl } from "@/lib/site-url";

export async function buyCreditPackage(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const packageId = Number(formData.get("package_id"));
  if (!packageId) redirect("/creditos?error=paquete+inválido");

  const supabase = await createClient();
  const { data: pkg } = await supabase
    .from("credit_packages")
    .select("id, name, price")
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle<{ id: number; name: string; price: number }>();

  if (!pkg) redirect("/creditos?error=paquete+no+disponible");

  const siteUrl = await getSiteUrl();

  let checkoutUrl: string;
  try {
    const preference = await createCreditPreference({
      userId: profile.id,
      packageId: pkg.id,
      packageName: pkg.name,
      price: pkg.price,
      siteUrl,
    });
    checkoutUrl = preference.init_point ?? preference.sandbox_init_point;
  } catch (err) {
    console.error("[creditos:buy] error creando preferencia MP:", err);
    redirect(
      `/creditos?error=${encodeURIComponent("No se pudo iniciar el pago. Intentá de nuevo.")}`,
    );
  }

  redirect(checkoutUrl);
}
