"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/app/actions";

type Props = {
  displayName: string;
  avatarPath: string | null;
  initial: string;
  isAdmin: boolean;
};

export function UserMenu({ displayName, avatarPath, initial, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cierra al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const ITEM =
    "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink-soft hover:bg-bg-subtle hover:text-ink hover:no-underline";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menú de usuario"
        className="flex items-center gap-2 rounded-pill px-2 py-1.5 text-sm font-medium text-ink-soft hover:bg-bg-subtle focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2"
      >
        <Avatar avatarPath={avatarPath} initial={initial} alt="" size="sm" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
          {/* Nombre del usuario */}
          <div className="px-3 py-2 text-xs font-semibold text-ink-soft">{displayName}</div>
          <div className="my-1 border-t border-border" />

          <Link href="/publicar" onClick={() => setOpen(false)} className={ITEM}>
            Publicar
          </Link>
          <Link href="/mis-publicaciones" onClick={() => setOpen(false)} className={ITEM}>
            Mis publicaciones
          </Link>
          <Link href="/perfil" onClick={() => setOpen(false)} className={ITEM}>
            Mi perfil
          </Link>

          {isAdmin && (
            <>
              <div className="my-1 border-t border-border" />
              <Link href="/admin/verificaciones" onClick={() => setOpen(false)} className={ITEM}>
                Verificaciones
              </Link>
              <Link href="/admin/planes" onClick={() => setOpen(false)} className={ITEM}>
                Planes
              </Link>
            </>
          )}

          <div className="my-1 border-t border-border" />
          <form action={signOut}>
            <button type="submit" className={`${ITEM} w-full text-left`}>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
