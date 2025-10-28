import {apiService} from "../../../features/ApiServices/ApiService";
import {mockRegisterResponse} from "../../auth/api/mocks";

type ApiResponse<T> = {
    status: string;
    message?: string;
    body: T;
};

export type RegisterPayload = {
    name: string;
    username: string;
    birthday: string;
    gender: "male" | "female";
    password: string;
};

const REGISTER_ENDPOINT = "/auth/signup";

export async function register(payload: RegisterPayload): Promise<{ message: string }> {
    try {
        const response = await apiService.request<ApiResponse<Record<string, unknown>>>(REGISTER_ENDPOINT, {
            method: "POST",
            body: payload,
        });
        return { message: response.message ?? "You have successfully registered" };
    } catch (error) {
        if (mockRegisterResponse) {
            return { message: mockRegisterResponse.message };
        }
        throw error;
    }
}
