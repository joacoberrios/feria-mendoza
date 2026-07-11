export const MP_OAUTH_STATE_COOKIE = "mp_oauth_state";

const MP_API_URL = "https://api.mercadopago.com";

export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MP_CLIENT_ID!,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: process.env.MP_OAUTH_REDIRECT_URI!,
  });

  return `https://auth.mercadopago.com/authorization?${params.toString()}`;
}

export type MpTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
  public_key?: string;
  live_mode: boolean;
};

export async function exchangeCodeForTokens(code: string): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.MP_OAUTH_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    throw new Error(`MP oauth/token (authorization_code) falló: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`MP oauth/token (refresh_token) falló: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
