import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicStorageUrl } from "@/lib/supabase/storage";
import { CONDITION_LABELS } from "@/lib/product-labels";

type ProductDetailRow = {
  id: number;
  title: string;
  description: string;
  price: number;
  condition: keyof typeof CONDITION_LABELS;
  categories: { name: string } | null;
  zones: { name: string } | null;
  product_photos: { storage_path: string; is_primary: boolean; position: number }[];
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, title, description, price, condition, categories(name), zones(name), product_photos(storage_path, is_primary, position)",
    )
    .eq("id", Number(id))
    .eq("status", "active")
    .maybeSingle<ProductDetailRow>();

  if (!product) notFound();

  const photos = [...product.product_photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.position - b.position;
  });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold mb-2">{product.title}</h1>
      <p className="text-lg font-medium mb-4">${product.price}</p>

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {photos.map((photo) => (
            <Image
              key={photo.storage_path}
              src={getPublicStorageUrl("product-photos", photo.storage_path)}
              alt={product.title}
              width={200}
              height={150}
              className="w-full h-32 object-cover rounded border"
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">Sin fotos</p>
      )}

      <p className="text-sm mb-3 whitespace-pre-wrap">{product.description}</p>
      <p className="text-sm text-gray-600">Categoría: {product.categories?.name}</p>
      <p className="text-sm text-gray-600">Zona: {product.zones?.name}</p>
      <p className="text-sm text-gray-600">
        Condición: {CONDITION_LABELS[product.condition]}
      </p>
    </main>
  );
}
