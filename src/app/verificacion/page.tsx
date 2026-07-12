import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { MAX_DNI_PHOTO_SIZE_BYTES } from "@/lib/dni-photo";
import { uploadDniPhoto } from "./actions";
import { FileField } from "@/components/ui/FileField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; uploaded?: string }>;
}) {
  const { error, uploaded } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  let previewUrl: string | null = null;
  if (profile.dni_photo_url) {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from("dni-photos")
      .createSignedUrl(profile.dni_photo_url, 60 * 5);
    previewUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-display text-xl font-semibold">Verificación de identidad</h1>
      {error && <Alert variant="err">{error}</Alert>}
      {uploaded && <Alert variant="ok">Foto subida, queda pendiente de revisión.</Alert>}

      {profile.verification_status === "approved" && (
        <Alert variant="ok">Tu identidad ya está verificada.</Alert>
      )}
      {profile.verification_status === "pending" && (
        <Alert variant="info">Tu foto está en revisión.</Alert>
      )}
      {profile.verification_status === "rejected" && (
        <Alert variant="err">Tu verificación fue rechazada. Volvé a subir tu foto de DNI.</Alert>
      )}

      {previewUrl && (
        <Image
          src={previewUrl}
          alt="Foto de DNI cargada"
          width={320}
          height={220}
          className="mb-4 rounded-md border border-border object-cover"
        />
      )}

      {profile.verification_status !== "approved" && (
        <form action={uploadDniPhoto} className="flex flex-col gap-1">
          <FileField
            name="dni_photo"
            label="Foto de tu DNI"
            hint={`Formato JPG o PNG, hasta ${(MAX_DNI_PHOTO_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB.`}
            accept="image/*"
            maxSizeBytes={MAX_DNI_PHOTO_SIZE_BYTES}
            required
          />
          <Button type="submit" className="mt-2 w-full">
            {profile.dni_photo_url ? "Volver a subir" : "Subir foto de DNI"}
          </Button>
        </form>
      )}

      <p className="mt-4 text-sm text-ink-soft">
        <Link href="/perfil" className="font-semibold text-azul-deep underline">
          Volver a mi perfil
        </Link>
      </p>
    </main>
  );
}
