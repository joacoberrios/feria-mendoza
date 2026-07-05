"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";

export async function updatePlan(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const planId = Number(formData.get("plan_id"));
  const priceRaw = String(formData.get("price") ?? "");
  const durationRaw = String(formData.get("duration_days") ?? "");
  const maxListingsRaw = String(formData.get("max_active_listings") ?? "");
  const maxPhotosRaw = String(formData.get("max_photos") ?? "");
  const commissionRaw = String(formData.get("commission_percentage") ?? "");
  const active = formData.get("active") === "on";

  const supabase = await createClient();
  const { error } = await supabase
    .from("publication_plans")
    .update({
      price: priceRaw ? Number(priceRaw) : null,
      duration_days: durationRaw ? Number(durationRaw) : null,
      max_active_listings: maxListingsRaw ? Number(maxListingsRaw) : null,
      max_photos: maxPhotosRaw ? Number(maxPhotosRaw) : null,
      commission_percentage: commissionRaw ? Number(commissionRaw) : null,
      active,
    })
    .eq("id", planId);

  if (error) {
    redirect(`/admin/planes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/planes");
  redirect("/admin/planes?saved=1");
}
