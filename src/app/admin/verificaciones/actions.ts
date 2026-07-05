"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { VerificationStatus } from "@/types/database";

async function setVerificationStatus(
  formData: FormData,
  status: Extract<VerificationStatus, "approved" | "rejected">,
) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const userId = String(formData.get("user_id") ?? "");
  const supabase = await createClient();
  await supabase.from("users").update({ verification_status: status }).eq("id", userId);

  revalidatePath("/admin/verificaciones");
}

export async function approveUser(formData: FormData) {
  await setVerificationStatus(formData, "approved");
}

export async function rejectUser(formData: FormData) {
  await setVerificationStatus(formData, "rejected");
}
