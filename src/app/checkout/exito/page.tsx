import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
      <h1 className="text-xl font-semibold mb-4">¡Pago recibido!</h1>
      <p className="text-sm mb-4">
        Tu pago se procesó correctamente. En unos segundos vas a ver reflejado el
        cambio de estado del producto.
      </p>
      {order && (
        <p className="text-sm text-gray-600">
          Orden #{order.id} — estado: <strong>{order.status}</strong>
        </p>
      )}
      <p className="mt-4 text-sm">
        <Link href="/productos" className="underline">
          Volver al catálogo
        </Link>
      </p>
    </main>
  );
}
