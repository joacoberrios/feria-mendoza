import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";

export default async function CheckoutExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const supabase = await createClient();

  const { data: order } = orderId
    ? await supabase.from("orders").select("id, status").eq("id", Number(orderId)).maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">¡Pago recibido!</h1>
      <Alert variant="ok">
        Tu pago se procesó correctamente. En unos segundos vas a ver reflejado el cambio de
        estado del producto.
      </Alert>
      {order && (
        <p className="mb-4 text-sm text-ink-soft">
          Orden #{order.id} — estado: <strong className="text-ink">{order.status}</strong>
        </p>
      )}
      <ButtonLink href="/productos">Volver al catálogo</ButtonLink>
    </main>
  );
}
