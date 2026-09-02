import { api } from "./api";
import type { Customer, Discount, Order, PaymentMethod, Product, StaffMember } from "../types";

export const productsApi = {
  list: (category?: string) => api.get<Product[]>("/products", { params: category ? { category } : undefined }),
};

export const customersApi = {
  list: (search?: string) => api.get<Customer[]>("/customers", { params: search ? { search } : undefined }),
  create: (data: { name: string; phone?: string; email?: string }) => api.post<Customer>("/customers", data),
};

export const staffApi = {
  list: () => api.get<StaffMember[]>("/staff"),
};

export const discountsApi = {
  list: () => api.get<Discount[]>("/discounts"),
};

export const settingsApi = {
  get: () => api.get<{ taxRate: number }>("/settings"),
};

export interface CreateOrderPayload {
  type: "DINE" | "WALK" | "DELIVERY";
  customerId?: string;
  waiterId?: string;
  discountId?: string;
  notes?: string;
  items: { productId: string; quantity: number; sessionId?: string }[];
  hold: boolean;
  paymentMethod?: PaymentMethod;
}

export const ordersApi = {
  create: (payload: CreateOrderPayload) => api.post<Order>("/orders", payload),
  list: (status?: string) => api.get<Order[]>("/orders", { params: status ? { status } : undefined }),
  checkout: (id: string, paymentMethod: PaymentMethod) =>
    api.patch<Order>(`/orders/${id}/checkout`, { paymentMethod }),
  cancel: (id: string) => api.patch<Order>(`/orders/${id}/cancel`),
};
