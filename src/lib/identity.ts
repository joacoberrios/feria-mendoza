import type { Profile } from "@/types/database";

export const DNI_NUMBER_PATTERN = /^[0-9]{7,8}$/;

// Misma cuenta que el CHECK de birth_date en 0018_identity_fields.sql
// (current_date - interval '18 years'), para que el mensaje de error del
// lado de la app y el backstop de la base representen la misma regla.
export function isAtLeast18(birthDateIso: string): boolean {
  const birth = new Date(birthDateIso);
  if (Number.isNaN(birth.getTime())) return false;

  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return birth <= cutoff;
}

export function formatFullName(profile: Pick<Profile, "first_name" | "last_name">): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ");
}

// birth_date es solo fecha calendario ("YYYY-MM-DD") — parsearla con
// `new Date()` la interpreta como medianoche UTC, y en Argentina
// (UTC-3) eso puede mostrar el día anterior. Formateo de texto en vez de
// pasar por Date.
export function formatCalendarDateEs(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Los 4 datos que el admin necesita para cotejar la foto de DNI contra lo
// declarado (ver /admin/verificaciones) — teléfono y zona no aportan nada
// a esa comparación, por eso no forman parte de este gate.
export function isIdentityComplete(
  profile: Pick<Profile, "first_name" | "last_name" | "birth_date">,
  hasDniNumber: boolean,
): boolean {
  return Boolean(profile.first_name && profile.last_name && profile.birth_date && hasDniNumber);
}
