import { fetchProfile } from "../routes/profile/api";

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
            this.checkPromise = fetchProfile()
                .then(() => {
                    this.status = "authenticated";
                    return true;
                })
                .catch(() => {
                    this.status = "unauthenticated";
                    return false;
                })
                .finally(() => {
                    this.checkPromise = null;
                });
        }

        return this.checkPromise;
    }
}

export const authManager = new AuthManager();
