import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { signOut } from "@/app/actions";
import { Avatar } from "@/components/ui/Avatar";

const NAV_LINK_CLASSES =
  "rounded-sm px-3 py-2 text-sm font-medium text-ink-soft hover:bg-bg-subtle hover:text-ink";

// Ver sección 07 de docs/design-system.html — header sticky con blur,
// isotipo circular con el gradiente cónico de marca.
export async function Topbar() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1120px] items-center gap-3.5 px-6 py-3.5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3.5 hover:no-underline"
          aria-label="Feria Mendoza, inicio"
        >
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-pill shadow-sm"
            style={{
              background:
                "conic-gradient(from 20deg, #4E63A8 0 14%, #A84A22 14% 30%, #6E4E96 30% 46%, #B23A3A 46% 60%, #4FA98C 60% 74%, #C4C4DD 74% 88%, #4E63A8 88% 100%)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="#1F1B24"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5.5a1.6 1.6 0 1 1 1.2 2.6c0 1 -1.2 1.4 -1.2 2.4" />
              <path d="M12 10.5 4 16.5h16L12 10.5Z" />
              <path
                d="M11 13.4c0 -.9 1 -1.2 1 -.2c0 -1 1 -.7 1 .2c0 .8 -1 1.3 -1 1.3s-1 -.5 -1 -1.3Z"
                fill="#B23A3A"
                stroke="none"
              />
            </svg>
          </span>
          <span className="font-display text-[1.05rem] font-bold leading-tight tracking-wide text-ink">
            FERIA MENDOZA
          </span>
        </Link>

        <nav aria-label="Principal" className="ml-2 flex items-center gap-1">
          <Link href="/productos" className={NAV_LINK_CLASSES}>
            Catálogo
          </Link>
          {profile && (
            <>
              <Link href="/publicar" className={NAV_LINK_CLASSES}>
                Publicar
              </Link>
              <Link href="/mis-publicaciones" className={NAV_LINK_CLASSES}>
                Mis publicaciones
              </Link>
              {profile.role === "admin" && (
                <>
                  <Link href="/admin/verificaciones" className={NAV_LINK_CLASSES}>
                    Verificaciones
                  </Link>
                  <Link href="/admin/planes" className={NAV_LINK_CLASSES}>
                    Planes
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {profile ? (
            <>
              <Link href="/perfil" className={`flex items-center gap-2 ${NAV_LINK_CLASSES}`}>
                <Avatar
                  avatarPath={profile.avatar_url}
                  initial={(profile.username ?? profile.full_name ?? "?")[0]!.toUpperCase()}
                  alt=""
                  size="sm"
                />
                {profile.full_name || "Mi perfil"}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-pill border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-soft hover:bg-bg-subtle focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-pill px-4 py-2 text-sm font-medium text-ink-soft hover:bg-bg-subtle hover:no-underline"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-pill bg-terracota-deep px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#93401d] hover:no-underline"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
