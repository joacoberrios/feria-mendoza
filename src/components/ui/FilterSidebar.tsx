"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  activeFilterCount: number;
  children: React.ReactNode;
};

export function FilterSidebar({ activeFilterCount, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Foco al abrir (mobile), restaurar al cerrar
  useEffect(() => {
    if (!isMobile) return;
    if (isOpen) {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }
  }, [isOpen, isMobile]);

  // Escape para cerrar + focus trap en mobile
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile]);

  // Bloquear scroll del body cuando el drawer está abierto en mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, isMobile]);

  // Mobile: hidden by default, fixed drawer when open.
  // Desktop: always visible as a left sidebar (no toggle needed).
  const panelClasses = isOpen
    ? "block fixed inset-y-0 left-0 w-80 z-[70] bg-surface shadow-xl overflow-y-auto"
    : "hidden md:block md:w-64 md:shrink-0";

  return (
    <>
      {/* Botón trigger — solo visible en mobile; en desktop el panel siempre está visible */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls="filter-panel"
        className="mb-4 flex items-center gap-2 rounded-pill border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-soft shadow-sm hover:bg-bg-subtle focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2 md:hidden"
      >
        <svg
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M2 4h12M4 8h8M6 12h4" />
        </svg>
        Filtros
        {activeFilterCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-terracota-deep px-1 text-[10px] font-semibold leading-none text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Backdrop mobile */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-[65] bg-ink/40 backdrop-blur-[2px] md:hidden"
          aria-hidden="true"
          onClick={() => {
            setIsOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}

      {/* Panel */}
      <aside
        ref={panelRef}
        id="filter-panel"
        className={panelClasses}
        {...(isMobile && isOpen
          ? { role: "dialog", "aria-modal": "true", "aria-label": "Filtros" }
          : {})}
      >
        <div className="flex items-center justify-between border-b border-border p-4 md:hidden" aria-hidden="true">
          <span className="font-medium text-ink">Filtros</span>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
            className="rounded-sm p-1 text-ink-soft hover:text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep"
            aria-label="Cerrar filtros"
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 p-4 md:p-0">{children}</div>
      </aside>
    </>
  );
}
