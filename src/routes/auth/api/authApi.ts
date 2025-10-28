import {apiService} from "../../../features/ApiServices/ApiService";
import {User} from "../../../types/user";
import {mockLoginResponse, mockRegisterResponse} from "./mocks";

type ApiResponse<T> = {
    status: string;
    message?: string;
    body: T;
};

type LoginApiBody = {
    user: ApiUser;
    token?: string;
};

type ApiUser = {
    username: string;
    created_at: string;
    name: string;
    surname: string;
    patronymic: string;
    gender: "male" | "female";
    date_of_birth: string;
    avatar_path?: string | null;
};

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

const LOGIN_ENDPOINT = "/auth/login";
const REGISTER_ENDPOINT = "/auth/signup";
const CHECK_AUTH_ENDPOINT = "/auth/refresh";

export async function login(payload: LoginPayload): Promise<User> {
    try {
        const response = await apiService.request<ApiResponse<LoginApiBody>>(LOGIN_ENDPOINT, {
            method: "POST",
            body: payload,
        });
        return mapUser(response.body.user);
    } catch (error) {
        if (mockLoginResponse) {
            return mockLoginResponse.body.user;
        }
        throw error;
    }
}

export async function register(payload: RegisterPayload): Promise<{ message: string }> {
    try {
        const response = await apiService.request<ApiResponse<Record<string, unknown>>>(REGISTER_ENDPOINT, {
            method: "POST",
            body: payload,
        });
        return { message: response.message ?? "Вы успешно зарегистрированы" };
    } catch (error) {
        if (mockRegisterResponse) {
            return { message: mockRegisterResponse.message };
        }
        throw error;
    }
}

export async function checkAuth(): Promise<boolean> {
    try {
        await apiService.request<ApiResponse<Record<string, unknown>>>(CHECK_AUTH_ENDPOINT, {
            method: "POST",
            parseJson: false,
        });
        return true;
    } catch (error) {
        // fall back to mock login state
        return !!mockLoginResponse;
    }
}

function mapUser(user: ApiUser): User {
    return {
        username: user.username,
        createdAt: user.created_at,
        name: user.name,
        surname: user.surname,
        patronymic: user.patronymic,
        gender: user.gender,
        dateOfBirth: user.date_of_birth,
        avatarPath: user.avatar_path ?? null,
    };
}
