import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { updateProfile } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: zones } = await supabase
    .from("zones")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Mi perfil</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {saved && <p className="mb-4 text-sm text-green-600">Perfil actualizado.</p>}

      <form action={updateProfile} className="flex flex-col gap-3">
        <label className="text-sm">
          Nombre completo
          <input
            name="full_name"
            defaultValue={profile.full_name ?? ""}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Teléfono
          <input
            name="phone"
            defaultValue={profile.phone ?? ""}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Zona
          <select
            name="zone_id"
            defaultValue={profile.zone_id ?? ""}
            required
            className="mt-1 w-full border rounded px-3 py-2"
          >
            <option value="" disabled>
              Elegí tu zona
            </option>
            {zones?.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="bg-black text-white rounded px-3 py-2">
          Guardar
        </button>
      </form>

      <p className="mt-6 text-sm">
        Estado de verificación: <strong>{profile.verification_status}</strong>
      </p>
      {profile.verification_status !== "approved" && (
        <Link href="/verificacion" className="underline text-sm">
          Subir foto de DNI
        </Link>
      )}
    </main>
  );
}
