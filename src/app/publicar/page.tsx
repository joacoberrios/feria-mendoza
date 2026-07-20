import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { MAX_PRODUCT_PHOTOS, MAX_PRODUCT_PHOTO_SIZE_BYTES } from "@/lib/product-photo";
import { CONDITION_LABELS, CONDITION_TONES } from "@/lib/product-labels";
import { fetchCategoryTree } from "@/lib/categories";
import { createProduct } from "./actions";
import { TextField } from "@/components/ui/TextField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { CategorySelect } from "@/components/ui/CategorySelect";
import { FileField } from "@/components/ui/FileField";
import { ChipRadioGroup } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default async function PublishProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.verification_status !== "approved") {
    redirect(
      `/verificacion?error=${encodeURIComponent("Necesitás verificar tu identidad antes de publicar productos.")}`,
    );
  }

  const supabase = await createClient();
  const [categoryTree, { data: zones }] = await Promise.all([
    fetchCategoryTree(supabase),
    supabase.from("zones").select("id, name").eq("active", true).order("name"),
  ]);

  const photoSlots = Array.from({ length: MAX_PRODUCT_PHOTOS }, (_, i) => i + 1);
  const conditionOptions = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value,
    label,
    tone: CONDITION_TONES[value as keyof typeof CONDITION_TONES],
  }));

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Publicar producto</h1>
      {error && <Alert variant="err">{error}</Alert>}

      <form action={createProduct} className="flex flex-col gap-1">
        <TextField name="title" label="Título" required />
        <Textarea name="description" label="Descripción" rows={4} required />
        <TextField name="price" type="number" label="Precio" min="0" step="0.01" required />
        <CategorySelect tree={categoryTree} />
        <Select name="zone_id" label="Zona" defaultValue="" required>
          <option value="" disabled>
            Elegí tu zona
          </option>
          {zones?.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </Select>
        <ChipRadioGroup name="condition" groupLabel="Condición" options={conditionOptions} required />

        <fieldset className="mb-[18px] max-w-[420px] rounded-md border border-border p-3.5">
          <legend className="px-1 text-sm font-semibold text-ink">
            Fotos (hasta {MAX_PRODUCT_PHOTOS})
          </legend>
          <div className="flex flex-col gap-1">
            {photoSlots.map((slot) => (
              <FileField
                key={slot}
                name={`photo_${slot}`}
                label={`Foto ${slot} ${slot === 1 ? "(obligatoria)" : "(opcional)"}`}
                hint={`Hasta ${(MAX_PRODUCT_PHOTO_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB.`}
                required={slot === 1}
                maxSizeBytes={MAX_PRODUCT_PHOTO_SIZE_BYTES}
              />
            ))}
          </div>
          <Select name="primary_slot" label="Foto principal" defaultValue="1">
            {photoSlots.map((slot) => (
              <option key={slot} value={slot}>
                Foto {slot}
              </option>
            ))}
          </Select>
        </fieldset>

        <Button type="submit" className="mt-2 w-full">
          Publicar
        </Button>
      </form>
    </main>
  );
}
