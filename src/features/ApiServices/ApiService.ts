export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
    parseJson?: boolean;
    body?: unknown;
    headers?: Record<string, string>;
}

export class ApiService {
    constructor(private readonly baseUrl: string = '') {}

    public async request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
        const { parseJson = true, headers = {}, body, ...rest } = options;

        const isJsonPayload = body !== undefined
            && typeof body === 'object'
            && !(body instanceof FormData)
            && !(body instanceof Blob)
            && !(body instanceof ArrayBuffer);

        const preparedHeaders: Record<string, string> = {
            ...(isJsonPayload ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
        };

        const preparedBody = body === undefined
            ? undefined
            : isJsonPayload
                ? JSON.stringify(body)
                : (body as BodyInit);

        const response = await fetch(`${this.baseUrl}${url}`, {
            credentials: 'include',
            headers: preparedHeaders,
            body: preparedBody,
            ...rest,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Request failed with status ${response.status}`);
        }

        if (!parseJson || response.status === 204) {
            return undefined as T;
        }

        return (await response.json()) as T;
    }
}

export const apiService = new ApiService();
