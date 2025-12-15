import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";
import { formatDateFromBackend, formatDateToBackend } from "@utils";
import { ensureHttpsAssetUrl } from "@shared/utils/url";

type ProfileResponseBody = {
    username: string;
    created_at: string;
    name: string;
    surname: string;
    patronymic: string;
    gender: string;
    date_of_birth: string;
    avatar_path: string | null;
    role?: string;
};

type ProfileResponse = ApiResponse<ProfileResponseBody>;

export type ProfileData = {
    username: string;
    email: string;
    fullName: string;
    firstName: string;
    lastName: string;
    middleName: string;
    gender: "male" | "female" | "";
    birthday: string;
    avatarUrl: string | null;
    createdAt: string;
    role: string;
};

export type UpdateProfilePayload = {
    firstName: string;
    lastName: string;
    middleName?: string;
    birthday?: string;
    gender?: "male" | "female" | "";
};

type UploadAvatarResponse = ApiResponse<{
    avatar_path: string;
}>;

const PROFILE_ENDPOINT = "/user/profile";
const EMAIL_DOMAIN = "@flintmail.ru";
const UPLOAD_AVATAR_ENDPOINT = "/user/upload/avatar";
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

function getApiBaseUrl(): string {
    if (typeof window !== "undefined" && typeof window.__API_BASE_URL__ === "string") {
        return window.__API_BASE_URL__;
    }

    const apiInstance = apiService as unknown as { baseUrl?: string };
    if (typeof apiInstance.baseUrl === "string") {
        return apiInstance.baseUrl;
    }

    return "";
}

function mapProfileResponse(body: ProfileResponseBody): ProfileData {
    const firstName = body.name?.trim() ?? "";
    const lastName = body.surname?.trim() ?? "";
    const middleName = body.patronymic?.trim() ?? "";

    const fullNameParts = [firstName, lastName, middleName].filter(Boolean);
    const fullName = fullNameParts.length > 0 ? fullNameParts.join(" ") : body.username;

    const email = body.username.includes("@")
        ? body.username
        : `${body.username}${EMAIL_DOMAIN}`;

    const gender = body.gender?.toLowerCase();
    const normalizedGender = gender === "male" || gender === "female" ? gender : undefined;

    return {
        username: body.username,
        email,
        fullName,
        firstName,
        lastName,
        middleName,
        gender: normalizedGender ?? "",
        birthday: formatDateFromBackend(body.date_of_birth),
        avatarUrl: ensureHttpsAssetUrl(body.avatar_path),
        createdAt: body.created_at,
        role: body.role?.trim().toLowerCase() || "user",
    };
}

export async function fetchProfile(): Promise<ProfileData> {
    const response = await apiService.request<ProfileResponse>(PROFILE_ENDPOINT);
    return mapProfileResponse(response.body);
}

export async function uploadProfileAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiService.request<UploadAvatarResponse>(UPLOAD_AVATAR_ENDPOINT, {
        method: "POST",
        body: formData,
    });

    return ensureHttpsAssetUrl(response.body.avatar_path) ?? "";
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileData> {
    const requestBody = {
        name: payload.firstName?.trim() ?? "",
        surname: payload.lastName?.trim() ?? "",
        patronymic: payload.middleName?.trim() ?? "",
        gender: payload.gender ?? "",
        date_of_birth: payload.birthday ? formatDateToBackend(payload.birthday) : "",
    };

    const response = await apiService.request<ProfileResponse>(PROFILE_ENDPOINT, {
        method: "PUT",
        body: requestBody,
    });

    return mapProfileResponse(response.body);
}
