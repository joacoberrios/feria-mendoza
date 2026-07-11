import Link from "next/link";

export default async function CheckoutPendientePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Pago pendiente</h1>
      <p className="text-sm mb-4">
        Tu pago{order ? ` de la orden #${order}` : ""} quedó pendiente de confirmación
        (por ejemplo, si pagaste con efectivo o transferencia). Te avisamos apenas se
        confirme.
      </p>
      <p className="text-sm">
        <Link href="/productos" className="underline">
          Volver al catálogo
        </Link>
      </p>
    </main>
  );
}
