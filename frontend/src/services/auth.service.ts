import { apiRequest } from "@/lib/api";

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export const registerUser = (data: RegisterPayload) =>
  apiRequest<unknown>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: data.name, email: data.email, password: data.password, phone: data.phoneNumber }),
  });

export const loginUser = (data: LoginPayload) =>
  apiRequest<Record<string, unknown>>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

// User management lives in the admin panel (/api/admin/users, via lib/erp.ts).
