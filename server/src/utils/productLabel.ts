import type { ProductType } from "@prisma/client";

// Time packages share generic names ("1 Hour", "30 Minutes") across
// PlayStation/Table Games/Skating, so qualify them with the category.
// Retail items (Espresso, Bottled Water, ...) already have unique names.
//
// The category name comes from the row now rather than a hardcoded map, so a
// category the shop renames reads correctly here the moment it is renamed.
export function qualifiedProductLabel(product: {
  name: string;
  type: ProductType;
  category: { name: string };
}): string {
  return product.type === "TIME_PACKAGE" ? `${product.category.name} ${product.name}` : product.name;
}
