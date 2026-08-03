"use client";

import Link from "next/link";
import type { CategoryTree } from "@/lib/categories";

type Props = {
  tree: CategoryTree;
  activeCategoryId: number | null;
  isOffer: boolean;
};

export function CategoryStrip({ tree, activeCategoryId, isOffer }: Props) {
  const categories = [
    ...tree.parents.map((p) => ({ id: p.id, name: p.name })),
    ...tree.generics.map((g) => ({ id: g.id, name: g.name })),
  ];

  return (
    <div className="relative mb-6 w-full">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex gap-2 pb-1">
          {/* Chip especial — Mansas Ofertas */}
          <Link
            href={isOffer ? "/productos" : "/productos?ofertas=1"}
            className={[
              "shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
              isOffer
                ? "border-dorado bg-dorado/15 text-malbec"
                : "border-border bg-surface text-ink-soft hover:border-malbec/30 hover:bg-malbec-10 hover:text-malbec",
            ].join(" ")}
          >
            🤫 Mansas Ofertas
          </Link>

          {categories.map((cat) => {
            const isActive = !isOffer && activeCategoryId === cat.id;
            return (
              <Link
                key={cat.id}
                href={isActive ? "/productos" : `/productos?category_id=${cat.id}`}
                className={[
                  "shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-dorado bg-dorado/15 text-malbec"
                    : "border-border bg-surface text-ink-soft hover:border-malbec/30 hover:bg-malbec-10 hover:text-malbec",
                ].join(" ")}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      </div>
      {/* Fade hint de scroll */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-arena to-transparent"
      />
    </div>
  );
}
