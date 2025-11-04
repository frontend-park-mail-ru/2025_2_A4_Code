import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";

export type RegisterPayload = {
    name: string;
    username: string;
    birthday: string;
    gender: "male" | "female";
    password: string;
};

type RegisterResponse = ApiResponse<unknown>;

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
    return apiService.request<RegisterResponse>("/auth/signup", {
        method: "POST",
        body: payload,
        skipAuthRefresh: true,
    });
}
