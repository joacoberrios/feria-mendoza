import Link from "next/link";
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
  const now = new Date().toISOString();

  const [
    categoryTree,
    { data: zones },
    { data: commissionPlan },
    { data: creditPlan },
    { data: creditRows },
  ] = await Promise.all([
    fetchCategoryTree(supabase),
    supabase.from("zones").select("id, name").eq("active", true).order("name"),
    supabase
      .from("publication_plans")
      .select("id")
      .eq("channel", "web")
      .eq("type", "commission")
      .eq("active", true)
      .maybeSingle<{ id: number }>(),
    supabase
      .from("publication_plans")
      .select("id")
      .eq("channel", "web")
      .eq("type", "credit")
      .eq("active", true)
      .maybeSingle<{ id: number }>(),
    supabase
      .from("credit_purchases")
      .select("credits_remaining")
      .eq("user_id", profile.id)
      .gt("credits_remaining", 0)
      .gt("expires_at", now),
  ]);

  const commissionActive = !!commissionPlan;
  const creditActive = !!creditPlan;
  const availableCredits = (creditRows ?? []).reduce(
    (sum, r) => sum + (r.credits_remaining as number),
    0,
  );

  const bothActive = commissionActive && creditActive;
  const neitherActive = !commissionActive && !creditActive;
  // Solo crédito activo pero sin saldo
  const creditOnlyNoBalance = !commissionActive && creditActive && availableCredits === 0;
  const canPublish = !neitherActive && !creditOnlyNoBalance;

  const photoSlots = Array.from({ length: MAX_PRODUCT_PHOTOS }, (_, i) => i + 1);
  const conditionOptions = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
    value,
    label,
    tone: CONDITION_TONES[value as keyof typeof CONDITION_TONES],
  }));

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 font-display text-xl font-semibold text-malbec">Publicar producto</h1>
      {error && <Alert variant="err">{error}</Alert>}

      {neitherActive && (
        <Alert variant="err">
          No hay planes de publicación disponibles. Contactá al administrador.
        </Alert>
      )}

      {creditOnlyNoBalance && (
        <Alert variant="info">
          Para publicar necesitás al menos 1 crédito.{" "}
          <Link href="/creditos" className="font-semibold underline">
            Comprá un paquete
          </Link>
          .
        </Alert>
      )}

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

        {/* Selector de modelo solo si ambos están activos */}
        {bothActive && (
          <fieldset className="mb-[18px] rounded-lg border border-border bg-surface p-4">
            <legend className="px-1 text-sm font-semibold text-ink">
              ¿Cómo querés publicar?
            </legend>
            <div className="mt-2 flex flex-col gap-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="publication_mode"
                  value="commission"
                  defaultChecked
                  className="mt-0.5 accent-malbec"
                />
                <div>
                  <p className="text-sm font-medium text-ink">
                    Gratis — 20% de comisión al vender
                  </p>
                  <p className="text-xs text-ink-soft">
                    Sin costo inicial. Solo pagás si vendés.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 ${availableCredits === 0 ? "opacity-50" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="publication_mode"
                  value="credit"
                  disabled={availableCredits === 0}
                  className="mt-0.5 accent-malbec"
                />
                <div>
                  <p className="text-sm font-medium text-ink">
                    1 crédito — sin comisión
                    {availableCredits > 0 && (
                      <span className="ml-2 text-xs font-semibold text-verde">
                        {availableCredits} disponible{availableCredits !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {availableCredits === 0 ? (
                      <>
                        No tenés créditos.{" "}
                        <Link href="/creditos" className="text-malbec underline">
                          Comprá un paquete
                        </Link>
                        .
                      </>
                    ) : (
                      "Se descuenta 1 crédito al publicar. La venta no paga comisión."
                    )}
                  </p>
                </div>
              </label>
            </div>
          </fieldset>
        )}

        {/* Si solo hay un modelo activo, lo mandamos como hidden */}
        {!bothActive && commissionActive && (
          <input type="hidden" name="publication_mode" value="commission" />
        )}
        {!bothActive && creditActive && availableCredits > 0 && (
          <input type="hidden" name="publication_mode" value="credit" />
        )}

        <Button type="submit" className="mt-2 w-full" disabled={!canPublish}>
          Publicar
        </Button>
      </form>
    </main>
  );
}
