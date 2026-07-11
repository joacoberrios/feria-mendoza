import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, MP_OAUTH_STATE_COOKIE } from "@/lib/mercadopago/oauth";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteUrl = await getSiteUrl();

  function redirectWithError(message: string) {
    return NextResponse.redirect(`${siteUrl}/perfil?mp_error=${encodeURIComponent(message)}`);
  }

  const mpError = searchParams.get("error");
  if (mpError) {
    return redirectWithError("No se pudo conectar tu cuenta de Mercado Pago.");
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return redirectWithError("Faltan datos de la respuesta de Mercado Pago.");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(MP_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(MP_OAUTH_STATE_COOKIE);

  if (!expectedState || expectedState !== state) {
    return redirectWithError("La conexión con Mercado Pago expiró o no es válida. Probá de nuevo.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const admin = createAdminClient();
    const { error } = await admin
      .from("users")
      .update({
        mp_access_token: tokens.access_token,
        mp_refresh_token: tokens.refresh_token,
        mp_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        mp_user_id: String(tokens.user_id),
      })
      .eq("id", user.id);

    if (error) {
      console.error("[mercadopago:oauth:callback] error guardando tokens:", error);
      return redirectWithError("No pudimos guardar la conexión con Mercado Pago.");
    }
  } catch (err) {
    console.error("[mercadopago:oauth:callback] error intercambiando el código:", err);
    return redirectWithError("No pudimos completar la conexión con Mercado Pago.");
  }

  return NextResponse.redirect(`${siteUrl}/perfil?mp_connected=1`);
}
