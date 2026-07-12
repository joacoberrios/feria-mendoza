import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";

export default async function CheckoutPendientePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Pago pendiente</h1>
      <Alert variant="info">
        Tu pago{order ? ` de la orden #${order}` : ""} quedó pendiente de confirmación (por
        ejemplo, si pagaste con efectivo o transferencia). Te avisamos apenas se confirme.
      </Alert>
      <ButtonLink href="/productos">Volver al catálogo</ButtonLink>
    </main>
  );
}
