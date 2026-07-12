import Link from "next/link";
import { signUp } from "../actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Crear cuenta</h1>
      {error && <Alert variant="err">{error}</Alert>}
      <form action={signUp} className="flex flex-col gap-1">
        <TextField name="email" type="email" label="Email" required />
        <TextField
          name="password"
          type="password"
          label="Contraseña"
          minLength={6}
          hint="Mínimo 6 caracteres."
          required
        />
        <Button type="submit" className="mt-2 w-full">
          Registrarme
        </Button>
      </form>
      <p className="mt-4 text-sm text-ink-soft">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-azul-deep underline">
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
