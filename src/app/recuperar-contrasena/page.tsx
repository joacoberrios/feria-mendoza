import Link from "next/link";
import { submitPasswordReset } from "./actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";

export default async function RecuperarContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Recuperar contraseña</h1>

      {ok && (
        <Alert variant="ok">
          Si el email existe en nuestro sistema, tu solicitud fue registrada. El equipo te va a
          contactar para confirmar tu identidad antes de aplicar el cambio.
        </Alert>
      )}

      {error && <Alert variant="err">{decodeURIComponent(error)}</Alert>}

      {!ok && (
        <>
          <p className="mb-4 text-sm text-ink-soft">
            Ingresá tu email y la nueva contraseña que querés usar. Vamos a verificar tu
            identidad antes de aplicar el cambio.
          </p>
          <form action={submitPasswordReset} className="flex flex-col gap-1">
            <TextField name="email" type="email" label="Email de tu cuenta" required />
            <TextField
              name="password"
              type="password"
              label="Nueva contraseña"
              hint="Mínimo 8 caracteres"
              required
            />
            <TextField
              name="confirm_password"
              type="password"
              label="Confirmar nueva contraseña"
              required
            />
            <Button type="submit" className="mt-2 w-full">
              Enviar solicitud
            </Button>
          </form>
        </>
      )}

      <p className="mt-4 text-sm text-ink-soft">
        <Link href="/login" className="font-semibold text-azul-deep underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </main>
  );
}
