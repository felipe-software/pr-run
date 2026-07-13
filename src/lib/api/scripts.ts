import * as Effect from "effect/Effect";

import type {
    ScriptInfo,
    ScriptOpenResult,
    ScriptRunResult,
    ScriptSourceResult,
    ScriptStreamEvent,
    ScriptTerminalCommandResult,
} from "@/types/pr-run";
import { runManagedEffect } from "@/runtime/run-effect";
import { projectPath } from "./projects";
import {
    clientRuntime,
    createApiError,
    parseEnvelope,
    requestMany,
    requestOne,
    sendRaw,
} from "./transport";

const SCRIPT_RESULT_MARKER = "__PR_RUN_SCRIPT_RESULT__";
const SCRIPT_EVENT_MARKER = "__PR_RUN_SCRIPT_EVENT__";

export const scriptApi = {
    createScript(title: string) {
        return requestOne<ScriptInfo>("/scripts", {
            json: { title },
            method: "POST",
        });
    },
    deleteScript(scriptId: string) {
        return requestOne<ScriptInfo>(scriptPath(scriptId), {
            method: "DELETE",
        });
    },
    getScriptSource(scriptId: string) {
        return requestOne<ScriptSourceResult>(scriptPath(scriptId, "/source"));
    },
    listScripts() {
        return requestMany<ScriptInfo>("/scripts");
    },
    openScript(scriptId: string) {
        return requestOne<ScriptOpenResult>(scriptPath(scriptId, "/open"), {
            method: "POST",
        });
    },
    prepareScriptTerminalCommand(
        projectId: string,
        branch: string,
        scriptId: string,
    ) {
        return requestOne<ScriptTerminalCommandResult>(
            projectScriptPath(projectId, scriptId, "/terminal-command"),
            { json: { branch }, method: "POST" },
        );
    },
    runScript(projectId: string, branch: string, scriptId: string) {
        return requestOne<ScriptRunResult>(
            projectScriptPath(projectId, scriptId, "/run"),
            { json: { branch }, method: "POST" },
        );
    },
    async runScriptStream(
        projectId: string,
        branch: string,
        scriptId: string,
        onEvent: (event: ScriptStreamEvent) => void,
    ) {
        const response = await sendRaw(
            projectScriptPath(projectId, scriptId, "/run/stream"),
            { json: { branch }, method: "POST", timeout: false },
        );

        if (!response.ok) {
            throw createApiError(response, await parseEnvelope(response));
        }
        if (!response.body) {
            throw new Error("Script stream is unavailable.");
        }

        return runManagedEffect(
            clientRuntime,
            Effect.tryPromise({
                catch: (error) => error,
                try: () => consumeScriptStream(response.body!, onEvent),
            }).pipe(Effect.withSpan("PrRunScripts.consumeStream")),
        );
    },
    updateScriptSource(scriptId: string, source: string) {
        return requestOne<ScriptInfo>(scriptPath(scriptId, "/source"), {
            json: { source },
            method: "PUT",
        });
    },
};

function scriptPath(scriptId: string, suffix = "") {
    return `/scripts/${encodeURIComponent(scriptId)}${suffix}`;
}

function projectScriptPath(
    projectId: string,
    scriptId: string,
    suffix: string,
) {
    return projectPath(
        projectId,
        `/scripts/${encodeURIComponent(scriptId)}${suffix}`,
    );
}

async function consumeScriptStream(
    stream: ReadableStream<Uint8Array>,
    onEvent: (event: ScriptStreamEvent) => void,
) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: ScriptRunResult | undefined;

    while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
            if (line.startsWith(SCRIPT_RESULT_MARKER)) {
                result = JSON.parse(
                    line.slice(SCRIPT_RESULT_MARKER.length),
                ) as ScriptRunResult;
            } else if (line.startsWith(SCRIPT_EVENT_MARKER)) {
                onEvent(
                    JSON.parse(
                        line.slice(SCRIPT_EVENT_MARKER.length),
                    ) as ScriptStreamEvent,
                );
            } else if (line) {
                onEvent({ type: "output", data: `${line}\r\n` });
            }
        }

        if (done) {
            break;
        }
    }

    if (!result) {
        throw new Error("Script execution ended without a result.");
    }
    return result;
}
