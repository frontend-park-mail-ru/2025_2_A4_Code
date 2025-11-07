import { setOnlineStatus } from "./onlineStatus";

const PROBE_URL = "/";
let inflightProbe: Promise<boolean> | null = null;

export async function probeOnlineStatus(): Promise<boolean> {
    if (inflightProbe) {
        return inflightProbe;
    }

    inflightProbe = performProbe().finally(() => {
        inflightProbe = null;
    });

    return inflightProbe;
}

async function performProbe(): Promise<boolean> {
    try {
        await fetch(PROBE_URL, {
            method: "HEAD",
            cache: "no-store",
            credentials: "same-origin",
        });
        setOnlineStatus(true);
        return true;
    } catch {
        setOnlineStatus(false);
        return false;
    }
}
