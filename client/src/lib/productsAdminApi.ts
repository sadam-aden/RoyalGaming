import { api } from "./api";
import type { Product, ProductCategory, ProductType, StationType } from "../types";

export interface ProductPayload {
  name: string;
  category: ProductCategory;
  type: ProductType;
  price: number;
  durationMin?: number;
  stationTypeLink?: StationType;
  inStock?: boolean;
  stockQty?: number;
}

export const productsAdminApi = {
  list: () => api.get<Product[]>("/products"),
  create: (data: ProductPayload) => api.post<Product>("/products", data),
  update: (id: string, data: Partial<ProductPayload>) => api.patch<Product>(`/products/${id}`, data),
  remove: (id: string) => api.delete(`/products/${id}`),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api.post<Product>(`/products/${id}/image`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
};
