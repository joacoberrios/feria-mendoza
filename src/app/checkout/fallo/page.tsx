import Link from "next/link";

export default async function CheckoutFalloPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">El pago no se pudo completar</h1>
      <p className="text-sm mb-4">
        Mercado Pago rechazó o canceló el pago{order ? ` de la orden #${order}` : ""}.
        Podés volver a intentarlo desde la página del producto.
      </p>
      <p className="text-sm">
        <Link href="/productos" className="underline">
          Volver al catálogo
        </Link>
      </p>
    </main>
  );
}
