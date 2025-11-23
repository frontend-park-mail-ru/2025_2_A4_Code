import { Router, type RouteConfig } from "@infra";
import { AuthPage } from "./auth";
import { RegisterPage } from "./register";
import { InboxPage } from "./inbox/InboxPage";
import { ProfilePage } from "./profile";

const routeDefinitions: RouteConfig[] = [
    {
        path: "/auth",
        createView: () => new AuthPage(),
        guestOnly: true,
    },
    {
        path: "/register",
        createView: () => new RegisterPage(),
        guestOnly: true,
    },
    {
        path: "/mail/:folder?/:messageId?",
        createView: (params: Record<string, string>) =>
            new InboxPage({ messageId: params.messageId, folderId: params.folder }),
        requiresAuth: true,
    },
    {
        path: "/profile",
        createView: () => new ProfilePage(),
        requiresAuth: true,
    },
];

export function setupRoutes(router: Router): void {
    routeDefinitions.forEach((route) => {
        router.addRoute(route);
    });
}
