import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { formatFullName, formatCalendarDateEs } from "@/lib/identity";
import { getDniNumbersByUserId } from "@/lib/supabase/dni-number";
import { Button } from "@/components/ui/Button";
import { approveUser, rejectUser } from "./actions";

export default async function AdminVerificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, phone, birth_date, dni_photo_url, created_at")
    .eq("verification_status", "pending")
    .order("created_at");

  const dniNumberById = await getDniNumbersByUserId((pending ?? []).map((u) => u.id));

  const rows = await Promise.all(
    (pending ?? []).map(async (u) => {
      let photoUrl: string | null = null;
      if (u.dni_photo_url) {
        const { data } = await supabase.storage
          .from("dni-photos")
          .createSignedUrl(u.dni_photo_url, 60 * 5);
        photoUrl = data?.signedUrl ?? null;
      }
      return { ...u, photoUrl, dniNumber: dniNumberById.get(u.id) ?? null };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">Verificaciones pendientes</h1>

      {rows.length === 0 && (
        <p className="text-sm text-ink-soft">No hay verificaciones pendientes.</p>
      )}

      <ul className="flex flex-col gap-6">
        {rows.map((u) => (
          <li
            key={u.id}
            className="flex gap-4 items-start rounded-lg border border-border bg-surface p-5 shadow-sm"
          >
            {u.photoUrl ? (
              <Image
                src={u.photoUrl}
                alt={`Foto de DNI de ${formatFullName(u) || u.email}`}
                width={160}
                height={112}
                className="rounded-md border border-border object-cover shrink-0"
              />
            ) : (
              <div className="w-40 h-28 shrink-0 flex items-center justify-center rounded-md border border-border text-xs text-ink-soft">
                Sin foto
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink">{formatFullName(u) || "(sin nombre)"}</p>
              <p className="text-sm text-ink-soft mt-0.5">{u.email}</p>
              <p className="text-sm text-ink-soft">{u.phone ?? "—"}</p>
              <p className="text-sm text-ink-soft">
                DNI: {u.dniNumber ?? "no cargado"}
                {u.birth_date && ` · Nacimiento: ${formatCalendarDateEs(u.birth_date)}`}
              </p>

              <div className="mt-4 flex gap-2">
                <form action={approveUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <Button type="submit" size="sm">
                    Aprobar
                  </Button>
                </form>
                <form action={rejectUser}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Rechazar
                  </Button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
