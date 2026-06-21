import { describe, expect, it } from "bun:test";

import { normalizeDockerServiceState, parseComposePsOutput } from "./index";

describe("normalizeDockerServiceState", () => {
    it("maps empty states to not-created", () => {
        expect(normalizeDockerServiceState(undefined)).toBe("not-created");
        expect(normalizeDockerServiceState("")).toBe("not-created");
    });

    it("normalizes known docker compose states", () => {
        expect(normalizeDockerServiceState("running")).toBe("running");
        expect(normalizeDockerServiceState("Exited")).toBe("exited");
        expect(normalizeDockerServiceState("restarting")).toBe("restarting");
    });

    it("falls back to unknown for unsupported states", () => {
        expect(normalizeDockerServiceState("removing")).toBe("unknown");
    });
});

describe("parseComposePsOutput", () => {
    it("parses json arrays", async () => {
        const result = await parseComposePsOutput(`[
  {
    "Service": "api",
    "Name": "pr-run-api-1",
    "State": "running",
    "Status": "Up 3 minutes",
    "Health": "healthy"
  }
]`);

        expect(result).toEqual([
            {
                containerName: "pr-run-api-1",
                health: "healthy",
                service: "api",
                state: "running",
                statusText: "Up 3 minutes",
            },
        ]);
    });

    it("parses newline-delimited json payloads", async () => {
        const result = await parseComposePsOutput(
            [
                '{"Service":"web","Name":"pr-run-web-1","State":"running","Status":"Up 10 seconds"}',
                '{"Service":"worker","Name":"pr-run-worker-1","State":"exited","Status":"Exited (1) 2 seconds ago"}',
            ].join("\n"),
        );

        expect(result).toEqual([
            {
                containerName: "pr-run-web-1",
                health: undefined,
                service: "web",
                state: "running",
                statusText: "Up 10 seconds",
            },
            {
                containerName: "pr-run-worker-1",
                health: undefined,
                service: "worker",
                state: "exited",
                statusText: "Exited (1) 2 seconds ago",
            },
        ]);
    });
});
