import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "./oauth";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Devuelve un access_token válido del vendedor, refrescándolo si está por
// vencer o ya venció. Cada refresh de Mercado Pago devuelve un
// refresh_token nuevo que también hay que guardar (no se puede reusar
// el viejo).
export async function getValidSellerAccessToken(sellerId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: seller } = await admin
    .from("users")
    .select("mp_access_token, mp_refresh_token, mp_token_expires_at")
    .eq("id", sellerId)
    .maybeSingle();

  if (!seller?.mp_access_token || !seller.mp_refresh_token) {
    return null;
  }

  const expiresAt = seller.mp_token_expires_at ? new Date(seller.mp_token_expires_at).getTime() : 0;
  const isExpiringSoon = expiresAt - Date.now() < REFRESH_BUFFER_MS;

  if (!isExpiringSoon) {
    return seller.mp_access_token;
  }

  const refreshed = await refreshAccessToken(seller.mp_refresh_token);

  await admin
    .from("users")
    .update({
      mp_access_token: refreshed.access_token,
      mp_refresh_token: refreshed.refresh_token,
      mp_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("id", sellerId);

  return refreshed.access_token;
}

export async function isSellerMpConnected(sellerId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("mp_access_token")
    .eq("id", sellerId)
    .maybeSingle();

  return Boolean(data?.mp_access_token);
}
