import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { isSellerMpConnected } from "@/lib/mercadopago/tokens";
import { connectMercadoPago, updateProfile } from "./actions";
import { MAX_AVATAR_SIZE_BYTES, USERNAME_PATTERN } from "@/lib/avatar-photo";
import { DNI_NUMBER_PATTERN } from "@/lib/identity";
import { hasDniNumber } from "@/lib/supabase/dni-number";
import { TextField } from "@/components/ui/TextField";
import { Select } from "@/components/ui/Select";
import { AvatarCropField } from "@/components/ui/AvatarCropField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; mp_error?: string; mp_connected?: string }>;
}) {
  const { error, saved, mp_error, mp_connected } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const mpConnected = await isSellerMpConnected(profile.id);
  const dniAlreadySaved = await hasDniNumber(profile.id);
  const supabase = await createClient();
  const { data: zones } = await supabase
    .from("zones")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Mi perfil</h1>
      {error && <Alert variant="err">{error}</Alert>}
      {saved && <Alert variant="ok">Perfil actualizado.</Alert>}

      <form action={updateProfile} className="flex flex-col gap-1">
        <AvatarCropField
          name="avatar"
          label="Foto de perfil"
          hint={`Formato JPG o PNG, hasta ${(MAX_AVATAR_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB. Vas a poder ajustar el encuadre antes de guardar.`}
          maxSizeBytes={MAX_AVATAR_SIZE_BYTES}
          currentAvatarPath={profile.avatar_url}
          placeholderInitial={(profile.username ?? profile.first_name ?? "?")[0]!.toUpperCase()}
        />
        <TextField
          name="username"
          label="Nombre de usuario"
          defaultValue={profile.username ?? ""}
          pattern={USERNAME_PATTERN.source}
          minLength={3}
          maxLength={20}
          hint="Solo letras, números y guion bajo. Entre 3 y 20 caracteres."
        />
        <TextField name="first_name" label="Nombre" defaultValue={profile.first_name ?? ""} required />
        <TextField name="last_name" label="Apellido" defaultValue={profile.last_name ?? ""} required />
        <TextField name="phone" type="tel" label="Teléfono" defaultValue={profile.phone ?? ""} />
        <TextField
          name="dni_number"
          label="DNI"
          inputMode="numeric"
          pattern={DNI_NUMBER_PATTERN.source}
          maxLength={8}
          hint={
            dniAlreadySaved
              ? "Ya tenés un DNI guardado — dejalo vacío si no querés cambiarlo, o escribí uno nuevo para reemplazarlo."
              : "Solo números, sin puntos (7 u 8 dígitos). Lo necesitás para verificar tu identidad."
          }
        />
        <TextField
          name="birth_date"
          type="date"
          label="Fecha de nacimiento"
          defaultValue={profile.birth_date ?? ""}
          hint="Tenés que ser mayor de 18 años para usar Feria Mendoza."
        />
        <Select name="zone_id" label="Zona" defaultValue={profile.zone_id ?? ""} required>
          <option value="" disabled>
            Elegí tu zona
          </option>
          {zones?.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </Select>
        <Button type="submit" className="mt-2 w-full">
          Guardar
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-6">
        {profile.verification_status === "approved" ? (
          <Alert variant="ok">Tu identidad ya está verificada.</Alert>
        ) : profile.verification_status === "pending" ? (
          <Alert variant="info">Tu verificación está en revisión.</Alert>
        ) : profile.verification_status === "rejected" ? (
          <Alert variant="err">
            Tu verificación fue rechazada.{" "}
            <Link href="/verificacion" className="font-semibold underline">
              Volvé a subir tu DNI
            </Link>
            .
          </Alert>
        ) : (
          <p className="text-sm text-ink-soft">
            Todavía no verificaste tu identidad.{" "}
            <Link href="/verificacion" className="font-semibold text-azul-deep underline">
              Subir foto de DNI
            </Link>
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <h2 className="mb-2 font-display text-base font-semibold">Mercado Pago</h2>
        {mp_error && <Alert variant="err">{mp_error}</Alert>}
        {mpConnected ? (
          <Alert variant="ok">
            {mp_connected ? "Conectaste tu cuenta de Mercado Pago." : "Tu cuenta de Mercado Pago está conectada."}{" "}
            Si publicás productos, vas a poder recibir los pagos de tus ventas.
          </Alert>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-soft">
              Esto solo hace falta si vas a <strong>vender</strong>: conectá tu cuenta de Mercado
              Pago para poder cobrar cuando alguien te compre algo. Si solo vas a comprar, no
              necesitás hacer nada acá.
            </p>
            <form action={connectMercadoPago}>
              <Button type="submit" variant="secondary" size="sm">
                Conectar Mercado Pago
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
