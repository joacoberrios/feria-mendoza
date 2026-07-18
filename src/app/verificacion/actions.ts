"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { MAX_DNI_PHOTO_SIZE_BYTES } from "@/lib/dni-photo";
import { isIdentityComplete } from "@/lib/identity";
import { hasDniNumber } from "@/lib/supabase/dni-number";

export async function uploadDniPhoto(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Respaldo del gate que ya muestra/oculta el form en la página — nunca
  // confiar solo en que la UI lo haya escondido.
  const profile = await getCurrentProfile();
  const dniSaved = await hasDniNumber(user.id);
  if (!profile || !isIdentityComplete(profile, dniSaved)) {
    redirect(
      `/verificacion?error=${encodeURIComponent("Completá tu nombre, apellido, DNI y fecha de nacimiento en tu perfil antes de subir la foto.")}`,
    );
  }

  const file = formData.get("dni_photo");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/verificacion?error=${encodeURIComponent("Elegí un archivo")}`);
  }

  // Respaldo por si el chequeo del lado del cliente no corrió (JS
  // deshabilitado, etc.) — no depender solo del bodySizeLimit de Next.js.
  if (file.size > MAX_DNI_PHOTO_SIZE_BYTES) {
    const maxMb = (MAX_DNI_PHOTO_SIZE_BYTES / 1024 / 1024).toFixed(0);
    redirect(
      `/verificacion?error=${encodeURIComponent(`La imagen supera el máximo de ${maxMb}MB`)}`,
    );
  }

  const extension = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/dni.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("dni-photos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    redirect(`/verificacion?error=${encodeURIComponent(uploadError.message)}`);
  }

  // dni_photo_url guarda el path del objeto en el bucket privado, no una
  // URL pública: el bucket no es público, hay que firmar la URL al mostrarla.
  const { error: updateError } = await supabase
    .from("users")
    .update({ dni_photo_url: path, verification_status: "pending" })
    .eq("id", user.id);

  if (updateError) {
    redirect(`/verificacion?error=${encodeURIComponent(updateError.message)}`);
  }

  redirect("/verificacion?uploaded=1");
}
