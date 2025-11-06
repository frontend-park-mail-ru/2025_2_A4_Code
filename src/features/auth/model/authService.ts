import {
    login,
    logout,
    register,
    type LoginPayload,
    type RegisterPayload,
} from "@entities/auth";
import { AUTH_PAGE_TEXTS, REGISTER_PAGE_TEXTS } from "@pages/constants/texts";
import { extractApiErrorMessage } from "@shared/utils/apiError";

export type AuthResult = { success: true } | { success: false; message: string };

export async function authenticate(payload: LoginPayload): Promise<AuthResult> {
    try {
        await login(payload);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            message: extractApiErrorMessage(error, AUTH_PAGE_TEXTS.genericError),
        };
    }
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
    try {
        await register(payload);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            message: extractApiErrorMessage(error, REGISTER_PAGE_TEXTS.genericError),
        };
    }
}

export async function performLogout(): Promise<void> {
    await logout();
}
