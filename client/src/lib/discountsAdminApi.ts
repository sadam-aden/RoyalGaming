import { api } from "./api";
import type { Discount, DiscountType } from "../types";

export interface DiscountPayload {
  name: string;
  type: DiscountType;
  value: number;
  startsAt?: string;
  endsAt?: string;
  productId?: string;
}

export const discountsAdminApi = {
  list: () => api.get<Discount[]>("/discounts"),
  create: (data: DiscountPayload) => api.post<Discount>("/discounts", data),
  update: (id: string, data: Partial<DiscountPayload> & { active?: boolean }) =>
    api.patch<Discount>(`/discounts/${id}`, data),
  remove: (id: string) => api.delete(`/discounts/${id}`),
};
