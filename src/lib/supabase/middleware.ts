import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// TODO(diagnóstico temporal): sacar este try/catch y los console.log una
// vez identificada la causa de MIDDLEWARE_INVOCATION_FAILED en producción.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  try {
    console.log(
      "SUPABASE_URL definida:",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    );
    console.log(
      "SUPABASE_ANON_KEY definida:",
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    );

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // Refresca la sesión si expiró. Necesario para que los Server
    // Components tengan la cookie actualizada (ver docs de @supabase/ssr).
    await supabase.auth.getUser();

    return supabaseResponse;
  } catch (error) {
    console.error(
      "updateSession falló:",
      error instanceof Error ? error.message : error,
      error instanceof Error ? error.stack : undefined,
    );
    return supabaseResponse;
  }
}
