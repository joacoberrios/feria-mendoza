import { headers } from "next/headers";

// No depender solo del header "origin": en producción/Vercel no siempre
// está presente (proxies, ciertos tipos de request), y eso rompía la URL
// de redirección de confirmación de email. VERCEL_PROJECT_PRODUCTION_URL
// es el dominio estable de producción que Vercel inyecta automáticamente.
export async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const origin = (await headers()).get("origin");
  return origin ?? "http://localhost:3000";
}
