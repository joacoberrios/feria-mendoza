"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizationUrl, MP_OAUTH_STATE_COOKIE } from "@/lib/mercadopago/oauth";
import { MAX_AVATAR_SIZE_BYTES, USERNAME_PATTERN } from "@/lib/avatar-photo";
import { DNI_NUMBER_PATTERN, isAtLeast18 } from "@/lib/identity";
import { saveOwnDniNumber } from "@/lib/supabase/dni-number";

export async function connectMercadoPago() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(MP_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10, // el código de autorización de MP expira a los 10 min
    path: "/",
  });

  redirect(buildAuthorizationUrl(state));
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zoneIdRaw = String(formData.get("zone_id") ?? "");
  const zoneId = zoneIdRaw ? Number(zoneIdRaw) : null;
  const username = String(formData.get("username") ?? "").trim();
  const dniNumber = String(formData.get("dni_number") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "").trim();

  if (username && !USERNAME_PATTERN.test(username)) {
    redirect(
      `/perfil?error=${encodeURIComponent("El nombre de usuario solo puede tener letras, números y guion bajo (3 a 20 caracteres).")}`,
    );
  }

  if (dniNumber && !DNI_NUMBER_PATTERN.test(dniNumber)) {
    redirect(`/perfil?error=${encodeURIComponent("El DNI tiene que tener solo números (7 u 8 dígitos).")}`);
  }

  if (birthDate && !isAtLeast18(birthDate)) {
    redirect(`/perfil?error=${encodeURIComponent("Tenés que ser mayor de 18 años para usar Feria Mendoza.")}`);
  }

  const update: Record<string, unknown> = {
    first_name: firstName,
    last_name: lastName,
    phone,
    zone_id: zoneId,
    // A diferencia del username, birth_date sí se puede vaciar
    // explícitamente desde este form (no hay ninguna regla de negocio que
    // lo impida) — el input ya viene precargado con el valor actual, así
    // que quedar vacío es una acción explícita del usuario.
    birth_date: birthDate || null,
  };
  // Vacío significa "no tocar" — no se puede vaciar un username ya
  // elegido desde este form, y la columna admite null para el resto.
  if (username) update.username = username;

  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_SIZE_BYTES) {
      const maxMb = (MAX_AVATAR_SIZE_BYTES / 1024 / 1024).toFixed(0);
      redirect(`/perfil?error=${encodeURIComponent(`La foto supera el máximo de ${maxMb}MB`)}`);
    }

    const extension = avatarFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) {
      redirect(`/perfil?error=${encodeURIComponent(uploadError.message)}`);
    }

    update.avatar_url = path;
  }

  const { error } = await supabase.from("users").update(update).eq("id", user.id);

  if (error) {
    // 23505 = unique_violation — el índice único de username (0016) es la
    // fuente de verdad, no un SELECT previo con condición de carrera.
    const message =
      error.code === "23505"
        ? "Ese nombre de usuario ya está en uso, probá con otro."
        : error.message;
    redirect(`/perfil?error=${encodeURIComponent(message)}`);
  }

  // dni_number va aparte, con el cliente admin (0018_identity_fields.sql
  // le revoca el SELECT a authenticated) — el id sale de auth.getUser()
  // de más arriba, nunca de un valor del form, para que este client con
  // más privilegios no pueda terminar escribiendo la fila de otro usuario.
  if (dniNumber) {
    const { error: dniError } = await saveOwnDniNumber(user.id, dniNumber);
    if (dniError) {
      redirect(`/perfil?error=${encodeURIComponent("No se pudo guardar el DNI. Probá de nuevo.")}`);
    }
  }

  redirect("/perfil?saved=1");
}
