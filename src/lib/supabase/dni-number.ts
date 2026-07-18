import { createAdminClient } from "@/lib/supabase/admin";

// dni_number tiene el SELECT revocado para anon/authenticated
// (0018_identity_fields.sql) — estos son los únicos puntos del código que
// lo tocan, todos vía el cliente admin.

export async function saveOwnDniNumber(userId: string, dniNumber: string) {
  const admin = createAdminClient();
  return admin.from("users").update({ dni_number: dniNumber }).eq("id", userId);
}

// Chequeo de presencia sin exponer el valor — usado para el hint en
// /perfil y el gate de /verificacion, ninguno de los dos necesita ver el
// número en sí.
export async function hasDniNumber(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("dni_number")
    .eq("id", userId)
    .maybeSingle<{ dni_number: string | null }>();

  return Boolean(data?.dni_number);
}

// Único lugar que lee el valor real — el panel de admin de
// verificaciones, para cotejarlo contra la foto de DNI.
export async function getDniNumbersByUserId(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, dni_number")
    .in("id", userIds)
    .returns<{ id: string; dni_number: string | null }[]>();

  return new Map((data ?? []).filter((row) => row.dni_number).map((row) => [row.id, row.dni_number as string]));
}
