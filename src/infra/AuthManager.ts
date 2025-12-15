import { fetchProfile } from "@entities/profile";
import { isOfflineError } from "@shared/api/ApiService";
import { deriveProfilePreview, getProfileCache, primeProfilePreview } from "@features/profile";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export class AuthManager {
    private status: AuthStatus = "unknown";
    private checkPromise: Promise<boolean> | null = null;
    private checkGeneration = 0;
    private readonly listeners = new Set<(status: AuthStatus) => void>();

    public getStatus(): AuthStatus {
        return this.status;
    }

    public setAuthenticated(isAuthenticated: boolean): void {
        this.invalidateCheck();
        this.updateStatus(isAuthenticated ? "authenticated" : "unauthenticated");
    }

    public markUnknown(): void {
        this.invalidateCheck();
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
            const generation = this.nextGeneration();
            this.checkPromise = this.resolveAuthentication(generation).finally(() => {
                if (this.isGenerationCurrent(generation)) {
                    this.checkPromise = null;
                }
            });
        }

        return this.checkPromise;
    }

    private async resolveAuthentication(generation: number): Promise<boolean> {
        if (this.tryPromoteUsingCache()) {
            this.applyStatusForGeneration("authenticated", generation);
            return true;
        }

        try {
            await fetchProfile();
            this.applyStatusForGeneration("authenticated", generation);
            return true;
        } catch (error) {
            const navigatorOffline = typeof navigator !== "undefined" && !navigator.onLine;
            if (isOfflineError(error) || navigatorOffline) {
                if (this.tryPromoteUsingCache()) {
                    this.applyStatusForGeneration("authenticated", generation);
                    return true;
                }
            }

            this.applyStatusForGeneration("unauthenticated", generation);
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

    private invalidateCheck(): void {
        this.checkGeneration += 1;
        this.checkPromise = null;
    }

    private nextGeneration(): number {
        this.checkGeneration += 1;
        return this.checkGeneration;
    }

    private isGenerationCurrent(generation: number): boolean {
        return this.checkGeneration === generation;
    }

    private applyStatusForGeneration(status: AuthStatus, generation: number): void {
        if (this.isGenerationCurrent(generation)) {
            this.updateStatus(status);
        }
    }
}

export const authManager = new AuthManager();
