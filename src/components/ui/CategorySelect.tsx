"use client";

import { useState } from "react";
import { Select } from "./Select";
import type { CategoryTree } from "@/lib/categories";

export type CategorySelectProps = {
  tree: CategoryTree;
  defaultCategoryId?: number | null;
};

// Selección de categoría en 2 pasos (Fase G): elegir un padre
// (Mujer/Hombre/Kids) despliega el select de sus hijas; una genérica
// (Electro, Muebles...) se elige directo, sin paso intermedio. El valor
// que viaja con el form es SIEMPRE una hoja, bajo name="category_id" —
// el server action revalida igual que la hoja exista (nunca confiar solo
// en la UI).
export function CategorySelect({ tree, defaultCategoryId }: CategorySelectProps) {
  const initial = (() => {
    if (defaultCategoryId == null) return { top: "", child: "" };
    if (tree.generics.some((g) => g.id === defaultCategoryId)) {
      return { top: `g:${defaultCategoryId}`, child: "" };
    }
    const parent = tree.parents.find((p) => p.children.some((c) => c.id === defaultCategoryId));
    if (parent) return { top: `p:${parent.id}`, child: String(defaultCategoryId) };
    // Categoría vieja/desactivada (producto anterior a la Fase G): se
    // arranca vacío y el usuario elige de nuevo.
    return { top: "", child: "" };
  })();

  const [top, setTop] = useState(initial.top);
  const [child, setChild] = useState(initial.child);

  const selectedParent = top.startsWith("p:")
    ? tree.parents.find((p) => p.id === Number(top.slice(2)))
    : undefined;
  const genericId = top.startsWith("g:") ? top.slice(2) : null;

  return (
    <>
      <Select
        id="category_top"
        label="Categoría"
        value={top}
        onChange={(event) => {
          setTop(event.target.value);
          setChild("");
        }}
        required
      >
        <option value="" disabled>
          Elegí una categoría
        </option>
        {tree.parents.map((p) => (
          <option key={`p:${p.id}`} value={`p:${p.id}`}>
            {p.name}
          </option>
        ))}
        {tree.generics.map((g) => (
          <option key={`g:${g.id}`} value={`g:${g.id}`}>
            {g.name}
          </option>
        ))}
      </Select>

      {selectedParent && (
        <Select
          name="category_id"
          label={`Sub-categoría de ${selectedParent.name}`}
          value={child}
          onChange={(event) => setChild(event.target.value)}
          required
        >
          <option value="" disabled>
            Elegí una sub-categoría
          </option>
          {selectedParent.children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      )}

      {genericId && <input type="hidden" name="category_id" value={genericId} />}
    </>
  );
}
