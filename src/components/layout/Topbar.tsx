import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { fetchCategoryTree } from "@/lib/categories";
import { signOut } from "@/app/actions";
import { Avatar } from "@/components/ui/Avatar";
import { formatFullName } from "@/lib/identity";
import type { Category } from "@/types/database";

const NAV_LINK_CLASSES =
  "rounded-sm px-3 py-2 text-sm font-medium text-ink-soft hover:bg-bg-subtle hover:text-ink";

// Dropdown CSS-only (hover + focus-within, sin JS): el Topbar sigue
// siendo Server Component. El wrapper con pt-1 mantiene el hover continuo
// entre el trigger y el panel (sin hueco que cierre el menú en el medio).
function NavDropdown({
  trigger,
  items,
}: {
  trigger: React.ReactNode;
  items: Category[];
}) {
  return (
    <div className="group relative">
      {trigger}
      <div className="absolute top-full left-0 z-50 hidden pt-1 group-focus-within:block group-hover:block">
        <div className="min-w-44 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/productos?category_id=${item.id}`}
              className="block rounded-sm px-3 py-2 text-sm text-ink-soft hover:bg-bg-subtle hover:text-ink hover:no-underline"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ver sección 07 de docs/design-system.html — header sticky con blur,
// isotipo circular con el gradiente cónico de marca.
export async function Topbar() {
  const profile = await getCurrentProfile();
  const categoryTree = await fetchCategoryTree(await createClient());
  // Username primero (Fase F); si todavía no eligió uno, el fallback es
  // el mismo que se mostraba antes de que existiera username.
  const displayName = profile
    ? profile.username
      ? `@${profile.username}`
      : formatFullName(profile) || "Mi perfil"
    : null;

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

        {/* Nav izquierda: solo categorías */}
        <nav aria-label="Principal" className="ml-2 hidden items-center gap-1 md:flex">
          <Link href="/productos" className={NAV_LINK_CLASSES}>
            Catálogo
          </Link>
          {categoryTree.parents.map((parent) => (
            <NavDropdown
              key={parent.id}
              trigger={
                <Link
                  href={`/productos?category_id=${parent.id}`}
                  className={`flex items-center gap-1 ${NAV_LINK_CLASSES}`}
                >
                  {parent.name}
                  <span aria-hidden="true" className="text-[.6rem]">
                    ▾
                  </span>
                </Link>
              }
              items={parent.children}
            />
          ))}
          {categoryTree.generics.length > 0 && (
            <NavDropdown
              trigger={
                <button type="button" className={`flex items-center gap-1 ${NAV_LINK_CLASSES}`}>
                  Más
                  <span aria-hidden="true" className="text-[.6rem]">
                    ▾
                  </span>
                </button>
              }
              items={categoryTree.generics}
            />
          )}
        </nav>

        {/* Zona derecha: acciones de usuario + auth */}
        <div className="ml-auto flex items-center gap-1">
          {profile ? (
            <>
              <Link href="/publicar" className={NAV_LINK_CLASSES}>
                Publicar
              </Link>
              <Link href="/mis-publicaciones" className={`hidden md:block ${NAV_LINK_CLASSES}`}>
                Mis pub.
              </Link>
              {profile.role === "admin" && (
                <>
                  <Link href="/admin/verificaciones" className={`hidden md:block ${NAV_LINK_CLASSES}`}>
                    Verif.
                  </Link>
                  <Link href="/admin/planes" className={`hidden md:block ${NAV_LINK_CLASSES}`}>
                    Planes
                  </Link>
                </>
              )}
              <Link href="/perfil" className={`flex items-center gap-2 ${NAV_LINK_CLASSES}`}>
                <Avatar
                  avatarPath={profile.avatar_url}
                  initial={(profile.username ?? profile.first_name ?? "?")[0]!.toUpperCase()}
                  alt=""
                  size="sm"
                />
                <span className="hidden md:inline">{displayName}</span>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="hidden rounded-pill border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-soft hover:bg-bg-subtle focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2 md:block"
                >
                  Salir
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
