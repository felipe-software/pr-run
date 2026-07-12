import type {
    BranchPageTab,
    SettingsSection,
} from "@/lib/components/templates/pr-run-app/types";

export type AppRoute =
    | { type: "overview"; projectId?: string }
    | {
          branchName: string;
          page?: BranchPageTab;
          projectId: string;
          type: "branch";
      }
    | { section: SettingsSection; type: "settings" };

export const APP_NAVIGATION_EVENT = "pr-run:navigate";

const settingsSections = new Set<SettingsSection>([
    "general",
    "appearance",
    "hotkeys",
    "projects",
    "scripts",
    "ssh",
    "diagnostics",
]);
const branchPages = new Set<BranchPageTab>([
    "activity",
    "run",
    "changes",
    "docker",
    "env",
]);

export function readAppRoute(
    location: Pick<
        Location,
        "pathname" | "protocol" | "search"
    > = window.location,
): AppRoute {
    if (location.protocol === "file:") {
        const route = new URLSearchParams(location.search).get("route");

        if (route) {
            return readAppRoute(new URL(route, "https://pr-run.local"));
        }
    }

    const segments = location.pathname
        .split("/")
        .filter(Boolean)
        .map((segment) => decodeURIComponent(segment));
    const routeStart = segments.findIndex((segment) =>
        ["branch", "overview", "project", "settings"].includes(segment),
    );
    const route = routeStart === -1 ? segments : segments.slice(routeStart);

    if (route[0] === "branch" && route[1] && route[2]) {
        const page = route[3] as BranchPageTab | undefined;

        return {
            branchName: route[2],
            page: page && branchPages.has(page) ? page : "activity",
            projectId: route[1],
            type: "branch",
        };
    }

    if (route[0] === "project" && route[1]) {
        return { projectId: route[1], type: "overview" };
    }

    if (route[0] === "settings") {
        const section = route[1] as SettingsSection | undefined;

        return {
            section:
                section && settingsSections.has(section) ? section : "general",
            type: "settings",
        };
    }

    return { type: "overview" };
}

export function appRoutePath(route: AppRoute) {
    if (route.type === "branch") {
        return `/branch/${encodeURIComponent(route.projectId)}/${encodeURIComponent(route.branchName)}/${route.page ?? "activity"}`;
    }

    if (route.type === "settings") {
        return `/settings/${route.section}`;
    }

    return route.projectId
        ? `/project/${encodeURIComponent(route.projectId)}`
        : "/overview";
}

export function navigateToAppRoute(route: AppRoute, replace = false) {
    const path = appRoutePath(route);
    const method = replace ? "replaceState" : "pushState";

    if (window.location.protocol === "file:") {
        window.history[method](route, "", `?route=${encodeURIComponent(path)}`);
        window.dispatchEvent(new CustomEvent(APP_NAVIGATION_EVENT));
        return;
    }

    window.history[method](route, "", path);
    window.dispatchEvent(new CustomEvent(APP_NAVIGATION_EVENT));
}
