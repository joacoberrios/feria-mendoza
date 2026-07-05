import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { signOut } from "./actions";

export default async function Home() {
  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-6">Feria Mendoza</h1>

      {!profile ? (
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/login" className="underline">
            Iniciar sesión
          </Link>
          <Link href="/register" className="underline">
            Crear cuenta
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <p>Hola, {profile.full_name || profile.email}</p>
          <Link href="/perfil" className="underline">
            Mi perfil
          </Link>
          <Link href="/verificacion" className="underline">
            Verificación de identidad
          </Link>
          {profile.role === "admin" && (
            <Link href="/admin/verificaciones" className="underline">
              Panel admin: verificaciones
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="mt-4 underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
