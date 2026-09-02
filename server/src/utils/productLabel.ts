import type { ProductCategory, ProductType } from "@prisma/client";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  PLAYSTATION: "PlayStation",
  TABLE_GAMES: "Table Games",
  SKATING: "Skating",
  COFFEE: "Coffee",
  CAFETERIA: "Cafeteria",
};

// Time packages share generic names ("1 Hour", "30 Minutes") across
// PlayStation/Table Games/Skating, so qualify them with the category.
// Retail items (Espresso, Bottled Water, ...) already have unique names.
export function qualifiedProductLabel(product: { name: string; category: ProductCategory; type: ProductType }): string {
  return product.type === "TIME_PACKAGE" ? `${CATEGORY_LABELS[product.category]} ${product.name}` : product.name;
}
