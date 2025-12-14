import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";

export type LoginPayload = {
    login: string;
    password: string;
};

export type TokenResponseBody = {
    access_token?: string;
    refresh_token?: string;
    accessToken?: string;
    refreshToken?: string;
};

export type RegisterPayload = {
    name: string;
    username: string;
    birthday: string;
    gender: "male" | "female";
    password: string;
};

type VoidResponse = ApiResponse<unknown>;
type LoginResponse = ApiResponse<TokenResponseBody>;

export async function login(payload: LoginPayload): Promise<LoginResponse> {
    return apiService.request<LoginResponse>("/auth/login", {
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

export async function register(payload: RegisterPayload): Promise<VoidResponse> {
    return apiService.request<VoidResponse>("/auth/signup", {
        method: "POST",
        body: payload,
        skipAuthRefresh: true,
    });
}
