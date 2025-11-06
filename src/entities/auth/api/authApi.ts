import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";

export type LoginPayload = {
    login: string;
    password: string;
};

export type RegisterPayload = {
    name: string;
    username: string;
    birthday: string;
    gender: "male" | "female";
    password: string;
};

type VoidResponse = ApiResponse<unknown>;

export async function login(payload: LoginPayload): Promise<VoidResponse> {
    return apiService.request<VoidResponse>("/auth/login", {
        method: "POST",
        body: payload,
        skipAuthRefresh: true,
    });
}

export async function logout(): Promise<VoidResponse> {
    return apiService.request<VoidResponse>("/auth/logout", {
        method: "POST",
        skipAuthRefresh: true,
    });
}

export async function refreshAuth(): Promise<VoidResponse> {
    return apiService.request<VoidResponse>("/auth/refresh", {
        method: "POST",
        skipAuthRefresh: true,
    });
}

export async function register(payload: RegisterPayload): Promise<VoidResponse> {
    return apiService.request<VoidResponse>("/auth/signup", {
        method: "POST",
        body: payload,
        skipAuthRefresh: true,
    });
}
