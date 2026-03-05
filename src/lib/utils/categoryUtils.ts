import { CategoryListDto } from "@/types/categories";

/**
 * Devuelve la ruta jerárquica completa de una categoría.
 * Ej: "Maquillaje > Labiales" (subcategoría) o "Categoría Padre" (raíz).
 */
export function getCategoryFullPath(
  categoryId: string | undefined | null,
  categories: CategoryListDto[]
): string {
  if (!categoryId) return "Sin categoría";

  const category = categories.find((c) => c.id === categoryId);
  if (!category) return "Sin categoría";

  if (!category.parent_id) return category.name;

  const parent = categories.find((c) => c.id === category.parent_id);
  return parent ? `${parent.name} > ${category.name}` : category.name;
}

/**
 * Dado un array de category IDs seleccionados, expande para incluir
 * todos los hijos de cualquier categoría padre seleccionada.
 * Útil para que al filtrar por un padre se muestren también sus hijos.
 */
export function expandCategoryIdsWithChildren(
  selectedIds: string[],
  categories: CategoryListDto[]
): string[] {
  const expanded = new Set(selectedIds);

  for (const id of selectedIds) {
    for (const cat of categories) {
      if (cat.parent_id === id) {
        expanded.add(cat.id);
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Genera las opciones de categoría para selectores y filtros
 * con la jerarquía completa en el label ("Padre > Hija").
 */
export function buildCategoryOptions(
  categories: CategoryListDto[]
): { label: string; value: string }[] {
  return categories.map((c) => ({
    label: getCategoryFullPath(c.id, categories),
    value: c.id,
  }));
}
