"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LENGTH = 8;

export async function submitPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!email || !password) {
    redirect("/recuperar-contrasena?error=Completá+todos+los+campos");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect(
      `/recuperar-contrasena?error=${encodeURIComponent(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)}`,
    );
  }

  if (password !== confirm) {
    redirect("/recuperar-contrasena?error=Las+contraseñas+no+coinciden");
  }

  const admin = createAdminClient();

  // Buscar el user_id por email en public.users.
  const { data: userRow } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle<{ id: string }>();

  if (userRow) {
    // Upsert: si ya había una solicitud pendiente, se sobreescribe.
    const { error: upsertError } = await admin.from("password_reset_requests").upsert(
      {
        user_id: userRow.id,
        pending_password: password,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upsertError) {
      console.error("[password-reset:submit] error al guardar solicitud:", upsertError);
    }
  }
  // Si el email no existe, no hacemos nada — mismo mensaje igual.

  redirect(`/recuperar-contrasena?ok=1`);
}
