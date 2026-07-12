import { resendConfirmation } from "../actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string }>;
}) {
  const { email, sent } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Revisá tu correo</h1>
      <p className="mb-4 text-sm text-ink-soft">
        Te enviamos un link de confirmación{email ? ` a ${email}` : ""}. Tenés que confirmarlo
        antes de poder iniciar sesión.
      </p>
      {sent && <Alert variant="ok">Te reenviamos el email de confirmación.</Alert>}
      <form action={resendConfirmation} className="flex flex-col gap-1">
        <TextField name="email" type="email" label="Tu email" defaultValue={email ?? ""} required />
        <Button type="submit" variant="secondary" className="mt-2 w-full">
          Reenviar email de confirmación
        </Button>
      </form>
    </main>
  );
}
