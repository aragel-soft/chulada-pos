import { Product } from "@/types/inventory";

export const MIXED_VALUE = undefined; 

export function getCommonValue<K extends keyof Product>(
  products: Product[],
  key: K
): Product[K] | undefined {
  if (products.length === 0) return undefined;

  const firstValue = products[0][key];
  const allSame = products.every((p) => p[key] === firstValue);

  return allSame ? firstValue : undefined;
}

export function getCommonTags(products: Product[]): string[] {
  if (products.length === 0) return [];
  
  const firstProductTags = products[0].tags || [];
  if (firstProductTags.length === 0) return [];

  return firstProductTags.filter(tag => 
    products.every(p => p.tags?.includes(tag))
  );
}
