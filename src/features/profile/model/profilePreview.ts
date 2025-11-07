import { fetchProfile, type ProfileData } from "@entities/profile";
import { getInitials } from "@utils/person";

const PROFILE_CACHE_TTL_MS = 14 * 60 * 1000;

export type ProfilePreview = {
    avatarUrl: string | null;
    initials: string;
    fullName: string;
    email: string;
};

type CacheEntry = {
    data: ProfilePreview;
    expiresAt: number;
};

let cache: CacheEntry | null = null;
let inFlightRequest: Promise<ProfilePreview> | null = null;

export function deriveProfilePreview(profile: ProfileData): ProfilePreview {
    const fullName = (profile.fullName || profile.username).trim() || profile.username;
    const avatarUrl = profile.avatarUrl ?? null;

    return {
        avatarUrl,
        initials: getInitials(fullName),
        fullName,
        email: profile.email,
    };
}

export function primeProfilePreview(preview: ProfilePreview): void {
    cache = {
        data: { ...preview },
        expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
    };
    inFlightRequest = Promise.resolve({ ...preview });
}

export function getCachedProfilePreview(): ProfilePreview | null {
    const cached = resolveCacheEntry();
    return cached ? { ...cached.data } : null;
}

export async function loadProfilePreview(): Promise<ProfilePreview> {
    const cached = resolveCacheEntry();
    if (cached) {
        return { ...cached.data };
    }

    if (!inFlightRequest) {
        inFlightRequest = fetchProfile()
            .then((profile) => {
                const preview = deriveProfilePreview(profile);
                primeProfilePreview(preview);
                return preview;
            })
            .catch((error) => {
                inFlightRequest = null;
                throw error;
            });
    }

    return inFlightRequest.then((preview) => ({ ...preview }));
}

function resolveCacheEntry(): CacheEntry | null {
    if (!cache) {
        return null;
    }

    if (cache.expiresAt <= Date.now()) {
        cache = null;
        inFlightRequest = null;
        return null;
    }

    return cache;
}
