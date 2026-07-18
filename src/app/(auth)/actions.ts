"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// Supabase a veces devuelve un error sin un .message útil (p. ej. cuando
// la respuesta de la API de Auth no tiene el shape esperado). En vez de
// mostrarle al usuario el objeto crudo (o "{}"), logueamos el error
// completo del lado del servidor (con sus propiedades no enumerables,
// como .message, que JSON.stringify normal no captura) para poder
// diagnosticarlo desde los logs de Vercel, y le mostramos un mensaje
// genérico si no hay uno real.
function logAndFormatAuthError(context: string, error: { message?: string }): string {
  console.error(`[auth:${context}]`, JSON.stringify(error, Object.getOwnPropertyNames(error)));

  if (error.message && error.message.trim() && error.message.trim() !== "{}") {
    return error.message;
  }

  return "No pudimos completar la operación. Probá de nuevo en unos minutos.";
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(logAndFormatAuthError("signUp", error))}`);
  }

  // Con "Confirm email" desactivado en Supabase, signUp ya devuelve
  // sesión creada — no hay ningún email que esperar, así que mandar a
  // "Revisá tu correo" sería un callejón sin salida para el usuario.
  if (data.session) {
    redirect("/");
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(logAndFormatAuthError("signIn", error))}`);
  }

  redirect("/");
}

export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
}
