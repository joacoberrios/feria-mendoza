"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizationUrl, MP_OAUTH_STATE_COOKIE } from "@/lib/mercadopago/oauth";

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
