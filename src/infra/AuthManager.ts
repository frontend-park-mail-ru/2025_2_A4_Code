import { fetchProfile } from "@entities/profile";
import { isOfflineError } from "@shared/api/ApiService";
import { deriveProfilePreview, getProfileCache, primeProfilePreview } from "@features/profile";

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export class AuthManager {
    private status: AuthStatus = "unknown";
    private checkPromise: Promise<boolean> | null = null;

    public getStatus(): AuthStatus {
        return this.status;
    }

    public setAuthenticated(isAuthenticated: boolean): void {
        this.status = isAuthenticated ? "authenticated" : "unauthenticated";
    }

    public markUnknown(): void {
        this.status = "unknown";
    }

    public async ensureAuthenticated(): Promise<boolean> {
        if (this.status === "authenticated") {
            return true;
        }

        if (this.status === "unauthenticated") {
            return false;
        }

        if (!this.checkPromise) {
            this.checkPromise = this.resolveAuthentication().finally(() => {
                this.checkPromise = null;
            });
        }

        return this.checkPromise;
    }

    private async resolveAuthentication(): Promise<boolean> {
        if (this.tryPromoteUsingCache()) {
            this.status = "authenticated";
            return true;
        }

        try {
            await fetchProfile();
            this.status = "authenticated";
            return true;
        } catch (error) {
            const navigatorOffline = typeof navigator !== "undefined" && !navigator.onLine;
            if (isOfflineError(error) || navigatorOffline) {
                if (this.tryPromoteUsingCache()) {
                    this.status = "authenticated";
                    return true;
                }
            }

            this.status = "unauthenticated";
            return false;
        }
    }

    private tryPromoteUsingCache(): boolean {
        const cached = getProfileCache();
        if (!cached) {
            return false;
        }

        const preview = deriveProfilePreview(cached);
        primeProfilePreview(preview);
        return true;
    }
}

export const authManager = new AuthManager();
