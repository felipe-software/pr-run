import { afterEach, describe, expect, test, vi } from "vitest";

import { scriptApi } from "@/lib/api/scripts";
import * as transport from "@/lib/api/transport";

const encoder = new TextEncoder();

function streamResponse(chunks: string[]) {
    return new Response(
        new ReadableStream<Uint8Array>({
            start(controller) {
                for (const chunk of chunks) {
                    controller.enqueue(encoder.encode(chunk));
                }
                controller.close();
            },
        }),
    );
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("script streaming API", () => {
    test("consumes split structured events, plain output, and a final result", async () => {
        vi.spyOn(transport, "sendRaw").mockResolvedValue(
            streamResponse([
                '__PR_RUN_SCRIPT_EVENT__{"type":"output","data":"first"}\nplain',
                ' line\n__PR_RUN_SCRIPT_RESULT__{"scriptId":"script","success":true,"durationMs":4,"commands":[]}\n',
            ]),
        );
        const events: unknown[] = [];

        const result = await scriptApi.runScriptStream(
            "project / one",
            "feature/a",
            "script / one",
            (event) => events.push(event),
        );

        expect(result).toMatchObject({
            durationMs: 4,
            scriptId: "script",
            success: true,
        });
        expect(events).toEqual([
            { data: "first", type: "output" },
            { data: "plain line\r\n", type: "output" },
        ]);
        expect(transport.sendRaw).toHaveBeenCalledWith(
            "/projects/project%20%2F%20one/scripts/script%20%2F%20one/run/stream",
            {
                json: { branch: "feature/a" },
                method: "POST",
                timeout: false,
            },
        );
    });

    test("rejects HTTP failures with parsed API metadata", async () => {
        vi.spyOn(transport, "sendRaw").mockResolvedValue(
            new Response(
                JSON.stringify({
                    _metadata: { code: "SCRIPT_EXECUTION_FAILED" },
                    data: [],
                    message: "Script failed",
                    type: "error",
                }),
                {
                    headers: { "content-type": "application/json" },
                    status: 500,
                },
            ),
        );

        await expect(
            scriptApi.runScriptStream("project", "main", "script", () => {}),
        ).rejects.toMatchObject({
            code: "SCRIPT_EXECUTION_FAILED",
            message: "Script failed",
            status: 500,
        });
    });

    test("rejects an unavailable response body", async () => {
        vi.spyOn(transport, "sendRaw").mockResolvedValue(new Response(null));

        await expect(
            scriptApi.runScriptStream("project", "main", "script", () => {}),
        ).rejects.toThrow("Script stream is unavailable");
    });

    test("rejects streams that end without a result", async () => {
        vi.spyOn(transport, "sendRaw").mockResolvedValue(
            streamResponse(["plain output\n"]),
        );

        await expect(
            scriptApi.runScriptStream("project", "main", "script", () => {}),
        ).rejects.toThrow("ended without a result");
    });
});
