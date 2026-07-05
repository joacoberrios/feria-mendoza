import Link from "next/link";
import { signIn } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Iniciar sesión</h1>
      {error && (
        <div className="mb-4 text-sm text-red-600">
          <p>{error}</p>
          {error.toLowerCase().includes("confirm") && (
            <p className="mt-1">
              <Link href="/verify-email" className="underline">
                Reenviar email de confirmación
              </Link>
            </p>
          )}
        </div>
      )}
      <form action={signIn} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="border rounded px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          required
          className="border rounded px-3 py-2"
        />
        <button type="submit" className="bg-black text-white rounded px-3 py-2">
          Entrar
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="underline">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
