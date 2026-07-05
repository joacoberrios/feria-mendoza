import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { DniPhotoInput } from "@/components/auth/DniPhotoInput";
import { uploadDniPhoto } from "./actions";

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
      <h1 className="text-xl font-semibold mb-4">Verificación de identidad</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {uploaded && (
        <p className="mb-4 text-sm text-green-600">
          Foto subida, queda pendiente de revisión.
        </p>
      )}

      <p className="mb-4 text-sm">
        Estado actual: <strong>{profile.verification_status}</strong>
      </p>

      {previewUrl && (
        <Image
          src={previewUrl}
          alt="Foto de DNI cargada"
          width={320}
          height={220}
          className="mb-4 rounded border object-cover"
        />
      )}

      {profile.verification_status === "approved" ? (
        <p className="text-sm">Tu identidad ya está verificada.</p>
      ) : (
        <form action={uploadDniPhoto} className="flex flex-col gap-3">
          <DniPhotoInput />
          <button type="submit" className="bg-black text-white rounded px-3 py-2">
            {profile.dni_photo_url ? "Volver a subir" : "Subir foto de DNI"}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm">
        <Link href="/perfil" className="underline">
          Volver a mi perfil
        </Link>
      </p>
    </main>
  );
}
