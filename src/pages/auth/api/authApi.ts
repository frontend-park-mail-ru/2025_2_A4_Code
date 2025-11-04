import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";

export type LoginPayload = {
    login: string;
    password: string;
};

type LoginResponse = ApiResponse<unknown>;

export async function login(payload: LoginPayload): Promise<LoginResponse> {
    return apiService.request<LoginResponse>("/auth/login", {
        method: "POST",
        body: payload,
        skipAuthRefresh: true,
    });
}

export async function logout(): Promise<void> {
    await apiService.request<ApiResponse<unknown>>("/auth/logout", {
        method: "POST",
        skipAuthRefresh: true,
    });
}

export async function refreshAuth(): Promise<void> {
    await apiService.request<ApiResponse<unknown>>("/auth/refresh", {
        method: "POST",
        skipAuthRefresh: true,
    });
}
