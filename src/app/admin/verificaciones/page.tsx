import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { approveUser, rejectUser } from "./actions";

export default async function AdminVerificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("users")
    .select("id, full_name, email, phone, dni_photo_url, created_at")
    .eq("verification_status", "pending")
    .order("created_at");

  const rows = await Promise.all(
    (pending ?? []).map(async (u) => {
      let photoUrl: string | null = null;
      if (u.dni_photo_url) {
        const { data } = await supabase.storage
          .from("dni-photos")
          .createSignedUrl(u.dni_photo_url, 60 * 5);
        photoUrl = data?.signedUrl ?? null;
      }
      return { ...u, photoUrl };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold mb-6">Verificaciones pendientes</h1>
      {rows.length === 0 && <p className="text-sm">No hay verificaciones pendientes.</p>}
      <ul className="flex flex-col gap-6">
        {rows.map((u) => (
          <li key={u.id} className="border rounded p-4 flex gap-4 items-start">
            {u.photoUrl ? (
              <Image
                src={u.photoUrl}
                alt={`Foto de DNI de ${u.full_name ?? u.email}`}
                width={160}
                height={112}
                className="rounded border object-cover"
              />
            ) : (
              <div className="w-40 h-28 flex items-center justify-center text-xs text-gray-500 border rounded">
                Sin foto
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium">{u.full_name ?? "(sin nombre)"}</p>
              <p className="text-sm text-gray-600">{u.email}</p>
              <p className="text-sm text-gray-600">{u.phone ?? "-"}</p>
              <div className="mt-3 flex gap-2">
                <form action={approveUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <button
                    type="submit"
                    className="bg-green-600 text-white rounded px-3 py-1 text-sm"
                  >
                    Aprobar
                  </button>
                </form>
                <form action={rejectUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <button
                    type="submit"
                    className="bg-red-600 text-white rounded px-3 py-1 text-sm"
                  >
                    Rechazar
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
