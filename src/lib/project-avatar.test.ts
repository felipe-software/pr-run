import { describe, expect, test } from "bun:test";

import {
    assignFolderAvatars,
    assignProjectAvatars,
} from "@/lib/project-avatar";

describe("project avatars", () => {
    test("creates deterministic SVG data URIs", () => {
        const first = assignFolderAvatars(["alpha", "beta"]);
        const second = assignFolderAvatars(["alpha", "beta"]);

        expect(first).toEqual(second);
        expect(first.get("alpha")).toStartWith("data:image/svg+xml;utf8,");
        expect(first.get("alpha")).not.toBe(first.get("beta"));
    });

    test("keeps project logos stable when project order changes", () => {
        const projects = [
            { id: "one", name: "One", path: "/projects/one" },
            { id: "two", name: "Two", path: "/projects/two" },
        ];

        const first = assignProjectAvatars(projects);
        const second = assignProjectAvatars([...projects].reverse());

        expect(first).toEqual(second);
    });
});
