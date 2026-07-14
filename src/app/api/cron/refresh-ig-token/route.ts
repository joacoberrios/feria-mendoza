import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const REFRESH_THRESHOLD_DAYS = 15;

// Vercel manda Authorization: Bearer $CRON_SECRET automáticamente en las
// invocaciones programadas de vercel.json cuando esa env var está seteada
// en el proyecto — esto rechaza cualquier otro caller.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("social_settings")
    .select("ig_access_token, ig_token_expires_at")
    .eq("id", 1)
    .maybeSingle<{ ig_access_token: string | null; ig_token_expires_at: string | null }>();

  if (!settings?.ig_access_token || !settings.ig_token_expires_at) {
    return NextResponse.json({ skipped: "no hay token configurado todavía" }, { status: 200 });
  }

  const daysUntilExpiry =
    (new Date(settings.ig_token_expires_at).getTime() - Date.now()) / (24 * 3_600_000);

  if (daysUntilExpiry > REFRESH_THRESHOLD_DAYS) {
    return NextResponse.json(
      { skipped: `faltan ${Math.round(daysUntilExpiry)} días, todavía no hace falta` },
      { status: 200 },
    );
  }

  try {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", settings.ig_access_token);

    const res = await fetch(url);
    const json = (await res.json().catch(() => null)) as
      | { access_token?: string; expires_in?: number; error?: { message?: string } }
      | null;

    if (!res.ok || !json?.access_token) {
      const message = json?.error?.message ?? `Error ${res.status} refrescando el token`;
      console.error("[cron:refresh-ig-token]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Meta documenta ~60 días de vigencia; si por algo no viene expires_in
    // en la respuesta, asumimos ese valor por defecto en vez de dejar el
    // token sin fecha de vencimiento.
    const expiresInSeconds = json.expires_in ?? 60 * 24 * 3600;

    await admin
      .from("social_settings")
      .update({
        ig_access_token: json.access_token,
        ig_token_expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return NextResponse.json({ ok: true, refreshed: true }, { status: 200 });
  } catch (err) {
    console.error("[cron:refresh-ig-token] excepción:", err);
    return NextResponse.json({ error: "excepción refrescando el token" }, { status: 500 });
  }
}
