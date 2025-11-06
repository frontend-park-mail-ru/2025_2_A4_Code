const CLEAR_DATA_CACHE = "SW_CLEAR_DATA_CACHE";

export const SW_MESSAGES = {
    CLEAR_DATA_CACHE,
} as const;

export type ServiceWorkerMessage = {
    type: (typeof SW_MESSAGES)[keyof typeof SW_MESSAGES];
};

export type ClearDataCacheMessage = {
    type: typeof SW_MESSAGES.CLEAR_DATA_CACHE;
};
