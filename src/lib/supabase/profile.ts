import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Lista explícita, no "*": dni_number tiene el SELECT revocado para
  // authenticated (0018_identity_fields.sql) y esta función se llama en
  // cada página vía Topbar — un "*" que incluya una columna sin permiso
  // rompe la query entera para cualquier usuario logueado, en todo el
  // sitio.
  const { data } = await supabase
    .from("users")
    .select(
      "id, email, first_name, last_name, phone, birth_date, zone_id, role, verification_status, dni_photo_url, username, avatar_url, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
}
