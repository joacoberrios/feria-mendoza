"use server";

import { createClient } from "@/lib/supabase/server";
import { USERNAME_PATTERN } from "@/lib/avatar-photo";

export type UsernameCheckResult =
  | { status: "available" }
  | { status: "taken"; suggestions: string[] }
  | { status: "invalid" };

const MAX_USERNAME_LENGTH = 20;
const SUGGESTION_SUFFIX_ROOM = 3; // deja lugar para "_99" sin pasar el máximo
const SUGGESTION_POOL_SIZE = 8;
const MAX_SUGGESTIONS = 3;

// Pool fijo de variantes a partir de una semilla aleatoria — la semilla
// evita que dos personas con el mismo nombre vean siempre las mismas
// sugerencias y choquen entre sí al elegirlas. Sin reintentos: estas 8 se
// chequean junto con el original en una sola query, y de ahí salen las
// que estén libres.
function buildSuggestionPool(base: string): string[] {
  const trimmed = base.slice(0, MAX_USERNAME_LENGTH - SUGGESTION_SUFFIX_ROOM);
  const seed = Math.floor(Math.random() * 90) + 10; // 2 dígitos, 10-99

  const pool: string[] = [];
  for (let i = 0; i < SUGGESTION_POOL_SIZE / 2; i++) {
    const n = (seed + i * 7) % 100;
    pool.push(`${trimmed}${n}`);
    pool.push(`${trimmed}_${n}`);
  }
  return pool;
}

// "_" es comodín de un carácter en ILIKE — sin escaparlo, chequear
// "juan_47" matchearía también "juanX47" y daría falsos "tomado".
function toIlikeCondition(candidate: string): string {
  return `username.ilike.${candidate.replace(/_/g, "\\_")}`;
}

export async function checkUsernameAvailability(raw: string): Promise<UsernameCheckResult> {
  const username = raw.trim();
  if (!USERNAME_PATTERN.test(username)) {
    return { status: "invalid" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Misma exigencia de sesión que el resto de las Server Actions — cierra
  // el chequeo a scripts anónimos sin cuenta (ver decisión sobre rate
  // limiting en la conversación: no se suma un limiter real por ahora).
  if (!user) {
    return { status: "invalid" };
  }

  const pool = buildSuggestionPool(username);
  const candidates = [username, ...pool];

  // Un solo round-trip: original + variantes juntos, contra la vista
  // pública (la RLS de users solo deja ver la fila propia; la vista
  // seller_public_profiles ya expone username sin RLS, ver 0016).
  // Se excluye la fila propia para que re-tipear tu username actual no
  // diga "tomado".
  const { data, error } = await supabase
    .from("seller_public_profiles")
    .select("username")
    .neq("id", user.id)
    .or(candidates.map(toIlikeCondition).join(","))
    .returns<{ username: string | null }[]>();

  // Ante un error de query preferimos no bloquear el flujo: el submit
  // real de updateProfile valida contra el índice único igual.
  if (error) {
    return { status: "available" };
  }

  const takenLower = new Set((data ?? []).map((row) => row.username?.toLowerCase()).filter(Boolean));

  if (!takenLower.has(username.toLowerCase())) {
    return { status: "available" };
  }

  const suggestions = pool.filter((s) => !takenLower.has(s.toLowerCase())).slice(0, MAX_SUGGESTIONS);
  return { status: "taken", suggestions };
}
