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

export type AdminCreateUserPayload = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  roleName: string;
  gender?: "MALE" | "FEMALE";
  profilePhoto?: string;
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

export const createUserByAdmin = (data: AdminCreateUserPayload) =>
  apiRequest<unknown>("/api/auth/create-by-admin", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getAllUsers = () =>
  apiRequest<unknown>("/api/auth/all-user");

export const getUser = (id: string) =>
  apiRequest<unknown>(`/api/auth/admin/users/${id}`);

export const updateUser = (
  id: string,
  data: Record<string, unknown>
) =>
  apiRequest<unknown>(`/api/auth/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteUser = (id: string) =>
  apiRequest<unknown>(`/api/auth/admin/users/${id}`, {
    method: "DELETE",
  });
