import {Router} from "../infra";
import {AuthPage} from "./auth";
import {RegisterPage} from "./register";
import {InboxPage} from "./inbox/InboxPage";
import {ProfilePage} from "./profile";
import {AuthLayout} from "../app/components/AuthLayout/AuthLayout";
import {MainLayout} from "../app/components/MainLayout/MainLayout";

const routeDefinitions = [
    {
        path: "/auth",
        layoutKey: "auth",
        createLayout: () => new AuthLayout(),
        createPage: () => new AuthPage(),
        guestOnly: true,
    },
    {
        path: "/register",
        layoutKey: "auth",
        createLayout: () => new AuthLayout(),
        createPage: () => new RegisterPage(),
        guestOnly: true,
    },
    {
        path: "/inbox/:messageId?",
        layoutKey: "main",
        createLayout: () => new MainLayout(),
        createPage: (params: Record<string, string>) => new InboxPage({ messageId: params.messageId }),
        requiresAuth: true,
    },
    {
        path: "/profile",
        layoutKey: "main",
        createLayout: () => new MainLayout(),
        createPage: () => new ProfilePage(),
        requiresAuth: true,
    },
];

export function setupRoutes(router: Router): void {
    routeDefinitions.forEach((route) => {
        router.addRoute(route);
    });
}
