import { afterEach, describe, expect, test, vi } from "vitest";

import {
    APP_NAVIGATION_EVENT,
    appRoutePath,
    navigateToAppRoute,
    readAppRoute,
} from "@/lib/navigation";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalCustomEvent = Object.getOwnPropertyDescriptor(
    globalThis,
    "CustomEvent",
);

function replaceGlobal(name: "CustomEvent" | "window", value: unknown) {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        value,
        writable: true,
    });
}

function restoreGlobal(
    name: "CustomEvent" | "window",
    descriptor?: PropertyDescriptor,
) {
    if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
        return;
    }

    Reflect.deleteProperty(globalThis, name);
}

afterEach(() => {
    restoreGlobal("window", originalWindow);
    restoreGlobal("CustomEvent", originalCustomEvent);
});

describe("application routes", () => {
    test("round trips branch names containing slashes", () => {
        const path = appRoutePath({
            branchName: "feature/browser-tabs",
            projectId: "project one",
            type: "branch",
        });

        expect(path).toBe(
            "/branch/project%20one/feature%2Fbrowser-tabs/activity",
        );
        expect(readAppRoute(new URL(path, "https://pr-run.local"))).toEqual({
            branchName: "feature/browser-tabs",
            page: "activity",
            projectId: "project one",
            type: "branch",
        });
    });

    test("reads project and settings pages", () => {
        expect(
            readAppRoute(new URL("/project/pr-run", "https://pr-run.local")),
        ).toEqual({ projectId: "pr-run", type: "overview" });
        expect(
            readAppRoute(new URL("/settings/hotkeys", "https://pr-run.local")),
        ).toEqual({ section: "hotkeys", type: "settings" });
    });

    test.each([
        "general",
        "appearance",
        "hotkeys",
        "projects",
        "scripts",
        "ssh",
        "diagnostics",
    ] as const)("reads the %s settings section", (section) => {
        expect(
            readAppRoute(
                new URL(`/settings/${section}`, "https://pr-run.local"),
            ),
        ).toEqual({ section, type: "settings" });
        expect(appRoutePath({ section, type: "settings" })).toBe(
            `/settings/${section}`,
        );
    });

    test("uses safe defaults for incomplete and unknown routes", () => {
        expect(
            readAppRoute(new URL("/settings/unknown", "https://pr-run.local")),
        ).toEqual({ section: "general", type: "settings" });
        expect(
            readAppRoute(new URL("/branch/project", "https://pr-run.local")),
        ).toEqual({ type: "overview" });
        expect(
            readAppRoute(new URL("/unrelated/path", "https://pr-run.local")),
        ).toEqual({ type: "overview" });
        expect(appRoutePath({ type: "overview" })).toBe("/overview");
    });

    test("finds application routes behind a path prefix", () => {
        expect(
            readAppRoute(
                new URL(
                    "/app/v1/branch/project/feature%2Fone/run",
                    "https://pr-run.local",
                ),
            ),
        ).toEqual({
            branchName: "feature/one",
            page: "run",
            projectId: "project",
            type: "branch",
        });
    });

    test("reads Electron file routes from the query string", () => {
        expect(
            readAppRoute(
                new URL(
                    "file:///app/index.html?route=%2Fproject%2Fproject%2520one",
                ),
            ),
        ).toEqual({ projectId: "project one", type: "overview" });
    });

    test("keeps each branch subpage addressable", () => {
        expect(
            readAppRoute(
                new URL(
                    "/branch/pr-run/feature%2Ftabs/changes",
                    "https://pr-run.local",
                ),
            ),
        ).toEqual({
            branchName: "feature/tabs",
            page: "changes",
            projectId: "pr-run",
            type: "branch",
        });
    });

    test.each(["activity", "run", "changes", "docker", "env"] as const)(
        "keeps the %s branch page addressable",
        (page) => {
            expect(
                readAppRoute(
                    new URL(
                        `/branch/project/feature/${page}`,
                        "https://pr-run.local",
                    ),
                ),
            ).toEqual({
                branchName: "feature",
                page,
                projectId: "project",
                type: "branch",
            });
        },
    );

    test("falls back to activity for an unknown branch page", () => {
        expect(
            readAppRoute(
                new URL(
                    "/branch/project/feature/unknown",
                    "https://pr-run.local",
                ),
            ),
        ).toMatchObject({ page: "activity", type: "branch" });
    });

    test.each([
        ["https:", false, "pushState", "/project/project-a"],
        ["https:", true, "replaceState", "/project/project-a"],
        ["file:", false, "pushState", "?route=%2Fproject%2Fproject-a"],
    ] as const)(
        "navigates with %s replace=%s",
        (protocol, replace, method, expectedPath) => {
            const history = {
                pushState: vi.fn(),
                replaceState: vi.fn(),
            };
            const dispatchEvent = vi.fn();
            replaceGlobal("window", {
                dispatchEvent,
                history,
                location: { protocol },
            });
            replaceGlobal(
                "CustomEvent",
                class CustomEvent {
                    constructor(readonly type: string) {}
                },
            );

            navigateToAppRoute(
                { projectId: "project-a", type: "overview" },
                replace,
            );

            expect(history[method]).toHaveBeenCalledWith(
                { projectId: "project-a", type: "overview" },
                "",
                expectedPath,
            );
            expect(dispatchEvent.mock.calls[0]?.[0]).toMatchObject({
                type: APP_NAVIGATION_EVENT,
            });
        },
    );
});
