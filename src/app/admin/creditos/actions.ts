"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function createPackage(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const name = String(formData.get("name") ?? "").trim();
  const credits = Number(formData.get("credits"));
  const price = parseFloat(String(formData.get("price") ?? ""));
  const expirationDays = Number(formData.get("expiration_days"));

  if (!name || !credits || !price || !expirationDays) {
    redirect(
      `/admin/creditos?error=${encodeURIComponent("Completá todos los campos requeridos.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("credit_packages").insert({
    name,
    credits,
    price,
    expiration_days: expirationDays,
    active: true,
  });

  if (error) {
    console.error("[admin:creditos:create]", error);
    redirect(
      `/admin/creditos?error=${encodeURIComponent("Error al crear el paquete.")}`,
    );
  }

  redirect("/admin/creditos?ok=created");
}

export async function updatePackage(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const packageId = Number(formData.get("package_id"));
  const credits = Number(formData.get("credits"));
  const price = parseFloat(String(formData.get("price") ?? ""));
  const expirationDays = Number(formData.get("expiration_days"));
  const active = formData.get("active") === "on";

  if (!packageId || !credits || !price || !expirationDays) {
    redirect(
      `/admin/creditos?error=${encodeURIComponent("Datos inválidos.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("credit_packages")
    .update({ credits, price, expiration_days: expirationDays, active })
    .eq("id", packageId);

  if (error) {
    console.error("[admin:creditos:update]", error);
    redirect(
      `/admin/creditos?error=${encodeURIComponent("Error al actualizar el paquete.")}`,
    );
  }

  redirect("/admin/creditos?ok=updated");
}
