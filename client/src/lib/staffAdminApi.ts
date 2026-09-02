import { api } from "./api";
import type { StaffMember, StaffRole } from "../types";

export interface StaffPayload {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
}

export const staffAdminApi = {
  list: () => api.get<StaffMember[]>("/staff"),
  create: (data: StaffPayload) => api.post<StaffMember>("/staff", data),
  update: (id: string, data: { name?: string; role?: StaffRole; active?: boolean }) =>
    api.patch<StaffMember>(`/staff/${id}`, data),
  resetPassword: (id: string, newPassword: string) => api.patch(`/staff/${id}/password`, { newPassword }),
  changeOwnPassword: (currentPassword: string, newPassword: string) =>
    api.patch("/staff/me/password", { currentPassword, newPassword }),
};
