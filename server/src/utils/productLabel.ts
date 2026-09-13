import type { ProductType } from "@prisma/client";

/**
 * How a product is named in reports.
 *
 * Receipts are not involved: those print `product.name` exactly as the shop
 * typed it, which is why products are named "Skating-30 Minutes" in the first
 * place — a receipt reading just "30 Minutes" would not say what was sold.
 *
 * Reports have the opposite problem when names *are* generic. Time packages can
 * share a name across PlayStation, Table Games and Skating, and three rows all
 * reading "1 Hour" rank against each other meaninglessly. So the category is
 * prefixed — but only when it is not already there, or a product the shop has
 * already qualified comes out doubled ("Skating Skating-30 Minutes").
 */
export function qualifiedProductLabel(product: {
  name: string;
  type: ProductType;
  category: { name: string };
}): string {
  if (product.type !== "TIME_PACKAGE") return product.name;
  if (startsWithCategory(product.name, product.category.name)) return product.name;
  return `${product.category.name} ${product.name}`;
}

/**
 * Whether the name already leads with its category.
 *
 * Compared with case and separators stripped, because the shop writes the two
 * apart: "Playstation-1 Hour" against a category called "PlayStation", or
 * "Table Games 1 Hour" against "Table Games".
 */
function startsWithCategory(name: string, category: string): boolean {
  const flatten = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const flatCategory = flatten(category);
  return flatCategory.length > 0 && flatten(name).startsWith(flatCategory);
}
