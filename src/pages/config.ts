import { Router, type RouteConfig } from "@infra";
import { AuthPage } from "./auth";
import { RegisterPage } from "./register";
import { InboxPage } from "./inbox/InboxPage";
import { ProfilePage } from "./profile";
import { AuthLayout } from "@app/components/AuthLayout/AuthLayout";
import { MainLayout } from "@app/components/MainLayout/MainLayout";

const layoutFactories = {
    auth: () => new AuthLayout(),
    main: () => new MainLayout(),
} as const;

type LayoutKey = keyof typeof layoutFactories;
type RouteBlueprint = Omit<RouteConfig, "createLayout"> & { layoutKey: LayoutKey };

const routeBlueprints: ReadonlyArray<RouteBlueprint> = [
    {
        path: "/auth",
        layoutKey: "auth",
        createPage: () => new AuthPage(),
        guestOnly: true,
    },
    {
        path: "/register",
        layoutKey: "auth",
        createPage: () => new RegisterPage(),
        guestOnly: true,
    },
    {
        path: "/inbox/:messageId?",
        layoutKey: "main",
        createPage: (params: Record<string, string>) => new InboxPage({ messageId: params.messageId }),
        requiresAuth: true,
    },
    {
        path: "/profile",
        layoutKey: "main",
        createPage: () => new ProfilePage(),
        requiresAuth: true,
    },
];

const routeDefinitions: RouteConfig[] = routeBlueprints.map((route) => ({
    ...route,
    createLayout: layoutFactories[route.layoutKey],
}));

export function setupRoutes(router: Router): void {
    routeDefinitions.forEach((route) => {
        router.addRoute(route);
    });
}
