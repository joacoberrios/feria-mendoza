"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  return profile;
}

export async function approvePasswordReset(formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get("request_id"));
  const admin = createAdminClient();

  // Leer pending_password — solo accesible vía service_role.
  const { data: req, error: fetchError } = await admin
    .from("password_reset_requests")
    .select("id, user_id, pending_password")
    .eq("id", requestId)
    .maybeSingle<{ id: number; user_id: string; pending_password: string }>();

  if (fetchError || !req) {
    redirect("/admin/restablecer-contrasenas?error=Solicitud+no+encontrada");
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(req.user_id, {
    password: req.pending_password,
  });

  if (updateError) {
    console.error("[password-reset:approve] error al actualizar contraseña:", updateError);
    redirect(
      `/admin/restablecer-contrasenas?error=${encodeURIComponent("No se pudo aplicar la contraseña: " + updateError.message)}`,
    );
  }

  // Borrar la fila inmediatamente — la contraseña pendiente no persiste.
  await admin.from("password_reset_requests").delete().eq("id", requestId);

  revalidatePath("/admin/restablecer-contrasenas");
  redirect("/admin/restablecer-contrasenas?ok=aprobada");
}

export async function rejectPasswordReset(formData: FormData) {
  await requireAdmin();
  const requestId = Number(formData.get("request_id"));
  const admin = createAdminClient();

  await admin.from("password_reset_requests").delete().eq("id", requestId);

  revalidatePath("/admin/restablecer-contrasenas");
}
