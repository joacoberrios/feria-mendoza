import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/types/database";

export type CategoryTree = {
  // Primer nivel con hijas (Mujer/Hombre/Kids) — NO elegibles como
  // category_id de un producto.
  parents: (Category & { children: Category[] })[];
  // Primer nivel sin hijas (Electro, Muebles, ... , Otros) — elegibles.
  generics: Category[];
};

export function buildCategoryTree(categories: Category[]): CategoryTree {
  const childrenByParent = new Map<number, Category[]>();
  for (const cat of categories) {
    if (cat.parent_id !== null) {
      const siblings = childrenByParent.get(cat.parent_id) ?? [];
      siblings.push(cat);
      childrenByParent.set(cat.parent_id, siblings);
    }
  }

  const parents: CategoryTree["parents"] = [];
  const generics: Category[] = [];
  for (const cat of categories) {
    if (cat.parent_id !== null) continue;
    const children = childrenByParent.get(cat.id);
    if (children) {
      parents.push({ ...cat, children });
    } else {
      generics.push(cat);
    }
  }

  return { parents, generics };
}

export async function fetchCategoryTree(supabase: SupabaseClient): Promise<CategoryTree> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, active, parent_id")
    .eq("active", true)
    .order("name")
    .returns<Category[]>();

  return buildCategoryTree(data ?? []);
}

// Hojas = lo único que un producto puede referenciar como category_id.
export function collectLeaves(tree: CategoryTree): Category[] {
  return [...tree.parents.flatMap((p) => p.children), ...tree.generics];
}

// Resuelve un category_id de filtro del catálogo: un padre significa
// "todas sus hijas"; una hoja se filtra directo.
export function resolveCategoryFilter(tree: CategoryTree, categoryId: number): number[] {
  const parent = tree.parents.find((p) => p.id === categoryId);
  if (parent) return parent.children.map((c) => c.id);
  return [categoryId];
}

// Respaldo server-side de la regla "solo hojas activas pueden ser
// category_id de un producto" (la UI de CategorySelect ya solo ofrece
// hojas, pero nunca confiar solo en la UI). No hay constraint de base
// para esto: un CHECK no puede mirar otras filas.
export async function isSelectableLeaf(
  supabase: SupabaseClient,
  categoryId: number,
): Promise<boolean> {
  const { data: category } = await supabase
    .from("categories")
    .select("id, active")
    .eq("id", categoryId)
    .maybeSingle<{ id: number; active: boolean }>();

  if (!category?.active) return false;

  const { data: child } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", categoryId)
    .limit(1)
    .maybeSingle<{ id: number }>();

  return !child;
}
