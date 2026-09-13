import { api } from "./api";
import type { ProductCategory } from "../types";

export interface CategoryPayload {
  name: string;
  color?: string;
  sortOrder?: number;
  active?: boolean;
}

export const categoriesApi = {
  /**
   * `includeInactive` is what separates the two callers: the POS should only
   * offer categories it can sell from, while the admin screen has to show the
   * switched-off ones in order to switch them back on.
   */
  list: (includeInactive = false) =>
    api.get<ProductCategory[]>("/categories", {
      params: includeInactive ? { includeInactive: true } : undefined,
    }),
  create: (data: CategoryPayload) => api.post<ProductCategory>("/categories", data),
  update: (id: string, data: Partial<CategoryPayload>) => api.patch<ProductCategory>(`/categories/${id}`, data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

/** Swatches offered when adding a category, matching the app's chart palette. */
export const CATEGORY_COLORS = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];
