import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/profile";

// Helpers compartidos entre actions.ts (Instagram) y whatsapp-actions.ts
// — en un archivo aparte (sin "use server") porque un módulo "use
// server" exige que TODO lo exportado sea una función async, y fail()
// no lo es.
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");
  return profile;
}

export function fail(message: string): never {
  redirect(`/admin/inbox?error=${encodeURIComponent(message)}`);
}
