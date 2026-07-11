import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypassea RLS y los column-grants de la tabla users (mp_access_token,
// mp_refresh_token, etc). Usar EXCLUSIVAMENTE en código de servidor que
// necesita leer/escribir esos campos puntuales (OAuth callback, checkout,
// refresh de token, webhook) — nunca en un camino alcanzable desde una
// query arbitraria del cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
