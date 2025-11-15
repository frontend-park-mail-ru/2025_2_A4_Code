import { apiService } from "@shared/api/ApiService";
import type { ApiResponse } from "@shared/api/types";

type SupportAppealDto = {
    topic: string;
    text: string;
    email?: string | null;
    status: string;
    created_at: string;
    updated_at: string;
};

type SupportAppealsResponse = {
    appeals: SupportAppealDto[];
    pagination: {
        has_next: boolean;
        next_last_appeal_id?: number;
        next_last_datetime?: string;
    };
};

type AdminAppealDto = {
    id: number;
    topic: string;
    text: string;
    status: string;
    created_at: string;
    updated_at: string;
    author_name: string;
    author_email: string;
};

type AdminAppealsResponse = {
    appeals: AdminAppealDto[];
};

type SupportStatsResponse = {
    total_appeals: number;
    open_appeals: number;
    in_progress_appeals: number;
    closed_appeals: number;
};

export type SupportAppealStatus = "open" | "in progress" | "closed";

export type SupportAppeal = {
    topic: string;
    text: string;
    status: SupportAppealStatus;
    createdAt: Date;
    updatedAt: Date;
};

export type FetchSupportAppealsParams = {
    lastAppealId?: number;
    lastDatetime?: string;
    limit?: number;
};

type FetchSupportAppealsResult = {
    appeals: SupportAppeal[];
    pagination: SupportAppealsResponse["pagination"];
};

export type SupportAdminAppeal = {
    id: number;
    topic: string;
    text: string;
    status: SupportAppealStatus;
    createdAt: Date;
    updatedAt: Date;
    authorName: string;
    authorEmail: string;
};

export type SupportSummaryStats = {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
};

export type SendSupportAppealPayload = {
    topic: string;
    text: string;
};

const APPEALS_ENDPOINT = "/support/appeals";
const SEND_APPEAL_ENDPOINT = "/support/send-appeal";
const ADMIN_APPEALS_ENDPOINT = "/support/admin/appeals";
const ADMIN_STATS_ENDPOINT = "/support/admin/stats";

export async function fetchSupportAppeals(
    params: FetchSupportAppealsParams = {}
): Promise<FetchSupportAppealsResult> {
    const searchParams = new URLSearchParams();

    if (typeof params.lastAppealId === "number") {
        searchParams.set("last_message_id", String(params.lastAppealId));
    }

    if (typeof params.lastDatetime === "string" && params.lastDatetime.trim().length > 0) {
        searchParams.set("last_datetime", params.lastDatetime);
    }

    if (typeof params.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const endpoint = query.length > 0 ? `${APPEALS_ENDPOINT}?${query}` : APPEALS_ENDPOINT;

    const response = await apiService.request<ApiResponse<SupportAppealsResponse>>(endpoint);
    const appeals =
        response.body.appeals
            ?.filter(isValidAppealDto)
            .map(mapAppealDto) ?? [];

    return {
        appeals,
        pagination: response.body.pagination,
    };
}

export async function sendSupportAppeal(payload: SendSupportAppealPayload): Promise<void> {
    await apiService.request<ApiResponse<unknown>>(SEND_APPEAL_ENDPOINT, {
        method: "POST",
        body: {
            topic: payload.topic,
            text: payload.text,
        },
    });
}

export async function fetchAdminSupportAppeals(
    params: FetchSupportAppealsParams = {}
): Promise<SupportAdminAppeal[]> {
    const searchParams = new URLSearchParams();

    if (typeof params.lastAppealId === "number") {
        searchParams.set("last_id", String(params.lastAppealId));
    }

    if (typeof params.lastDatetime === "string" && params.lastDatetime.trim().length > 0) {
        searchParams.set("last_datetime", params.lastDatetime);
    }

    if (typeof params.limit === "number") {
        searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    const endpoint = query.length > 0 ? `${ADMIN_APPEALS_ENDPOINT}?${query}` : ADMIN_APPEALS_ENDPOINT;
    const response = await apiService.request<ApiResponse<AdminAppealsResponse>>(endpoint);

    return (response.body.appeals ?? []).map(mapAdminAppealDto);
}

export async function fetchSupportSummaryStats(): Promise<SupportSummaryStats> {
    const response = await apiService.request<ApiResponse<SupportStatsResponse>>(ADMIN_STATS_ENDPOINT);
    return {
        total: response.body.total_appeals,
        open: response.body.open_appeals,
        inProgress: response.body.in_progress_appeals,
        closed: response.body.closed_appeals,
    };
}

export async function updateSupportAppealStatus(id: number, status: SupportAppealStatus): Promise<void> {
    await apiService.request<ApiResponse<unknown>>(`${ADMIN_APPEALS_ENDPOINT}/${id}`, {
        method: "PATCH",
        body: { status },
    });
}

function mapAppealDto(dto: SupportAppealDto): SupportAppeal {
    return {
        topic: dto.topic?.trim() ?? "",
        text: dto.text?.trim() ?? "",
        status: normalizeStatus(dto.status),
        createdAt: safeDate(dto.created_at),
        updatedAt: safeDate(dto.updated_at),
    };
}

function mapAdminAppealDto(dto: AdminAppealDto): SupportAdminAppeal {
    return {
        id: dto.id,
        topic: dto.topic?.trim() ?? "",
        text: dto.text?.trim() ?? "",
        status: normalizeStatus(dto.status),
        createdAt: safeDate(dto.created_at),
        updatedAt: safeDate(dto.updated_at),
        authorName: dto.author_name?.trim() ?? "",
        authorEmail: dto.author_email?.trim() ?? "",
    };
}

function safeDate(value: string | undefined): Date {
    const timestamp = value ? Date.parse(value) : Number.NaN;
    if (Number.isNaN(timestamp)) {
        return new Date();
    }
    return new Date(timestamp);
}

function isValidAppealDto(dto: SupportAppealDto | null | undefined): dto is SupportAppealDto {
    if (!dto) {
        return false;
    }

    const topicLength = dto.topic?.trim().length ?? 0;
    const textLength = dto.text?.trim().length ?? 0;
    const statusLength = dto.status?.trim().length ?? 0;
    const hasTimestamp = typeof dto.created_at === "string" && dto.created_at.trim().length > 0;

    return hasTimestamp && (topicLength > 0 || textLength > 0 || statusLength > 0);
}

function normalizeStatus(rawStatus: string | undefined): SupportAppealStatus {
    const normalized = rawStatus?.trim().toLowerCase() ?? "";
    switch (normalized) {
        case "open":
            return "open";
        case "closed":
            return "closed";
        case "in progress":
        case "in_progress":
            return "in progress";
        default:
            return "open";
    }
}
