import Link from "next/link";
import { signIn } from "../actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Iniciar sesión</h1>
      {error && (
        <Alert variant="err">
          <p>{error}</p>
          {error.toLowerCase().includes("confirm") && (
            <p className="mt-1">
              <Link href="/verify-email" className="font-semibold text-azul-deep underline">
                Reenviar email de confirmación
              </Link>
            </p>
          )}
        </Alert>
      )}
      <form action={signIn} className="flex flex-col gap-1">
        <TextField name="email" type="email" label="Email" required />
        <TextField name="password" type="password" label="Contraseña" required />
        <Button type="submit" className="mt-2 w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-4 text-sm text-ink-soft">
        ¿No tenés cuenta?{" "}
        <Link href="/register" className="font-semibold text-azul-deep underline">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
