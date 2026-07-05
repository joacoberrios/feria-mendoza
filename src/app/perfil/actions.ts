"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zoneIdRaw = String(formData.get("zone_id") ?? "");
  const zoneId = zoneIdRaw ? Number(zoneIdRaw) : null;

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName, phone, zone_id: zoneId })
    .eq("id", user.id);

  if (error) {
    redirect(`/perfil?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/perfil?saved=1");
}
