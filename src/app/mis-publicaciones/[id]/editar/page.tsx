import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { CONDITION_LABELS, CONDITION_TONES } from "@/lib/product-labels";
import { fetchCategoryTree } from "@/lib/categories";
import type { Product } from "@/types/database";
import { updateProduct } from "./actions";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { CategorySelect } from "@/components/ui/CategorySelect";
import { ChipRadioGroup } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", Number(id))
    .eq("seller_id", profile.id)
    .maybeSingle<Product>();

  if (!product) notFound();

  const [categoryTree, { data: zones }] = await Promise.all([
    fetchCategoryTree(supabase),
    supabase.from("zones").select("id, name").eq("active", true).order("name"),
  ]);

  const conditionOptions = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value,
    label,
    tone: CONDITION_TONES[value as keyof typeof CONDITION_TONES],
  }));

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Editar producto</h1>
      {error && <Alert variant="err">{error}</Alert>}
      {saved && <Alert variant="ok">Cambios guardados.</Alert>}

      <form action={updateProduct} className="flex flex-col gap-1">
        <input type="hidden" name="product_id" value={product.id} />
        <TextField name="title" label="Título" defaultValue={product.title} required />
        <Textarea
          name="description"
          label="Descripción"
          defaultValue={product.description}
          rows={4}
          required
        />
        <TextField
          name="price"
          type="number"
          label="Precio"
          min="0"
          step="0.01"
          defaultValue={product.price}
          required
        />
        <CategorySelect tree={categoryTree} defaultCategoryId={product.category_id} />
        <Select name="zone_id" label="Zona" defaultValue={product.zone_id} required>
          {zones?.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </Select>
        <ChipRadioGroup
          name="condition"
          groupLabel="Condición"
          options={conditionOptions}
          defaultValue={product.condition}
          required
        />

        <Button type="submit" className="mt-2 w-full">
          Guardar cambios
        </Button>
      </form>
    </main>
  );
}
