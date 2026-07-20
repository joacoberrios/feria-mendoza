"use client";

import { useState } from "react";
import type { CategoryTree } from "@/lib/categories";

type Props = {
  tree: CategoryTree;
  defaultCategoryId: number | null;
  defaultSubId: number | null;
};

const BASE =
  "rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-azul-deep focus-visible:outline-offset-2 cursor-pointer";
const ACTIVE = "border-terra-muted bg-terra-subtle text-terracota-deep";
const INACTIVE = "border-border bg-surface text-ink-soft hover:bg-bg-subtle hover:text-ink";

export function CategoryFilterChips({ tree, defaultCategoryId, defaultSubId }: Props) {
  // Rehydrate initial state from URL params
  const initParent = defaultCategoryId
    ? tree.parents.find((p) => p.id === defaultCategoryId) ?? null
    : null;
  const initSub =
    initParent && defaultSubId && initParent.children.some((c) => c.id === defaultSubId)
      ? defaultSubId
      : null;
  const initGeneric =
    !initParent && defaultCategoryId
      ? (tree.generics.find((g) => g.id === defaultCategoryId) ?? null)
      : null;

  const [parentId, setParentId] = useState<number | null>(initParent?.id ?? null);
  const [subId, setSubId] = useState<number | null>(initSub);
  const [genericId, setGenericId] = useState<number | null>(initGeneric?.id ?? null);

  const selectedParent = tree.parents.find((p) => p.id === parentId) ?? null;

  function selectParent(id: number) {
    setParentId(id);
    setSubId(null);
    setGenericId(null);
  }

  function selectGeneric(id: number) {
    setGenericId(id);
    setParentId(null);
    setSubId(null);
  }

  function clearAll() {
    setParentId(null);
    setSubId(null);
    setGenericId(null);
  }

  // Hidden inputs emitted to the form on submit
  const categoryIdValue = genericId ?? parentId ?? "";
  const subIdValue = subId ?? "";

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Categoría</span>

      {/* Primera fila: Todas + padres + genéricas */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={clearAll}
          className={`${BASE} ${!parentId && !genericId ? ACTIVE : INACTIVE}`}
        >
          Todas
        </button>
        {tree.parents.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectParent(p.id)}
            className={`${BASE} ${parentId === p.id ? ACTIVE : INACTIVE}`}
          >
            {p.name}
          </button>
        ))}
        {tree.generics.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => selectGeneric(g.id)}
            className={`${BASE} ${genericId === g.id ? ACTIVE : INACTIVE}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Segunda fila: subcategorías del padre elegido */}
      {selectedParent && selectedParent.children.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Sub-categoría de {selectedParent.name}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubId(null)}
              className={`${BASE} ${subId === null ? ACTIVE : INACTIVE}`}
            >
              Todas
            </button>
            {selectedParent.children.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSubId(c.id)}
                className={`${BASE} ${subId === c.id ? ACTIVE : INACTIVE}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden inputs para el form GET */}
      {categoryIdValue !== "" && (
        <input type="hidden" name="category_id" value={categoryIdValue} />
      )}
      {subIdValue !== "" && (
        <input type="hidden" name="sub_id" value={subIdValue} />
      )}
    </div>
  );
}
