import { fetchProfile } from "@entities/profile";
import { isOfflineError } from "@shared/api/ApiService";
import { deriveProfilePreview, getProfileCache, primeProfilePreview } from "@features/profile";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export class AuthManager {
    private status: AuthStatus = "unknown";
    private checkPromise: Promise<boolean> | null = null;
    private readonly listeners = new Set<(status: AuthStatus) => void>();

    public getStatus(): AuthStatus {
        return this.status;
    }

    public setAuthenticated(isAuthenticated: boolean): void {
        this.updateStatus(isAuthenticated ? "authenticated" : "unauthenticated");
    }

    public markUnknown(): void {
        this.updateStatus("unknown");
    }

    public onStatusChange(listener: (status: AuthStatus) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
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
            this.updateStatus("authenticated");
            return true;
        }

        try {
            await fetchProfile();
            this.updateStatus("authenticated");
            return true;
        } catch (error) {
            const navigatorOffline = typeof navigator !== "undefined" && !navigator.onLine;
            if (isOfflineError(error) || navigatorOffline) {
                if (this.tryPromoteUsingCache()) {
                    this.updateStatus("authenticated");
                    return true;
                }
            }

            this.updateStatus("unauthenticated");
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

    private updateStatus(nextStatus: AuthStatus): void {
        if (this.status === nextStatus) {
            return;
        }
        this.status = nextStatus;
        this.notifyStatusChanged();
    }

    private notifyStatusChanged(): void {
        this.listeners.forEach((listener) => {
            try {
                listener(this.status);
            } catch (error) {
                console.error("Auth status listener failed", error);
            }
        });
    }
}

export const authManager = new AuthManager();
