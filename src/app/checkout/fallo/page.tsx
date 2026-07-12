import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";

export default async function CheckoutFalloPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">El pago no se pudo completar</h1>
      <Alert variant="err">
        Mercado Pago rechazó o canceló el pago{order ? ` de la orden #${order}` : ""}. Podés
        volver a intentarlo desde la página del producto.
      </Alert>
      <ButtonLink href="/productos">Volver al catálogo</ButtonLink>
    </main>
  );
}
