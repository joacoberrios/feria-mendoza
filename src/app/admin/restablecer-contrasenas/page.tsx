import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { formatFullName } from "@/lib/identity";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { WhatsAppContact } from "./WhatsAppContact";
import { approvePasswordReset, rejectPasswordReset } from "./actions";

type RequestRow = {
  id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  users: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  } | null;
};

export default async function AdminRestablecerContrasenasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/");

  const admin = createAdminClient();

  // pending_password NO se selecciona — ni se necesita acá.
  const { data: requests } = await admin
    .from("password_reset_requests")
    .select(
      "id, user_id, created_at, updated_at, users!password_reset_requests_user_id_fkey(first_name, last_name, email, phone)",
    )
    .order("updated_at", { ascending: true })
    .returns<RequestRow[]>();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 font-display text-xl font-semibold">
        Solicitudes de recuperación de contraseña
      </h1>

      {ok === "aprobada" && (
        <Alert variant="ok">Contraseña actualizada correctamente.</Alert>
      )}
      {error && <Alert variant="err">{decodeURIComponent(error)}</Alert>}

      {(!requests || requests.length === 0) && (
        <p className="text-sm text-ink-soft">No hay solicitudes pendientes.</p>
      )}

      <ul className="flex flex-col gap-6 mt-2">
        {requests?.map((req) => {
          const user = req.users;
          const displayName = user
            ? formatFullName(user) || "(sin nombre)"
            : "(usuario eliminado)";

          return (
            <li
              key={req.id}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <p className="font-semibold text-ink">{displayName}</p>
              {user?.email && (
                <p className="text-sm text-ink-soft mt-0.5">{user.email}</p>
              )}
              {user?.phone && (
                <p className="text-sm text-ink-soft">Tel: {user.phone}</p>
              )}
              <p className="text-xs text-ink-soft mt-1">
                Solicitada:{" "}
                {new Date(req.updated_at).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              {user?.phone ? (
                <WhatsAppContact
                  name={displayName}
                  phone={user.phone}
                  email={user.email ?? ""}
                />
              ) : (
                <p className="mt-3 text-xs text-ink-soft italic">
                  Este usuario no tiene teléfono registrado. Verificá su identidad antes de aprobar.
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <form action={approvePasswordReset}>
                  <input type="hidden" name="request_id" value={req.id} />
                  <Button type="submit" size="sm">
                    Aprobar
                  </Button>
                </form>

                <form action={rejectPasswordReset}>
                  <input type="hidden" name="request_id" value={req.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Rechazar
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
