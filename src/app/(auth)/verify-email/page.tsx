import { resendConfirmation } from "../actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; sent?: string }>;
}) {
  const { email, sent } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Revisá tu correo</h1>
      <p className="text-sm mb-4">
        Te enviamos un link de confirmación{email ? ` a ${email}` : ""}. Tenés
        que confirmarlo antes de poder iniciar sesión.
      </p>
      {sent && (
        <p className="mb-4 text-sm text-green-600">
          Te reenviamos el email de confirmación.
        </p>
      )}
      <form action={resendConfirmation} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="Tu email"
          defaultValue={email ?? ""}
          required
          className="border rounded px-3 py-2"
        />
        <button type="submit" className="border rounded px-3 py-2">
          Reenviar email de confirmación
        </button>
      </form>
    </main>
  );
}
