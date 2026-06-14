import { readFileSync, unlinkSync } from "node:fs";
import { pathToFileURL } from "node:url";

import type {
    ScriptCommandResult,
    ScriptInfo,
    ScriptRunResult,
} from "@/backend/types";

import {
    beginScriptRegistration,
    finishScriptRegistration,
    type ScriptCommandApi,
    type ScriptContext,
    tryPromise,
} from "./runtime.ts";

const RESULT_MARKER = "__PR_RUN_SCRIPT_RESULT__";
const EVENT_MARKER = "__PR_RUN_SCRIPT_EVENT__";

type InspectPayload = {
    action: "inspect";
    filePath: string;
    scriptId: string;
};

type RunPayload = {
    action: "run";
    context: ScriptContext;
    filePath: string;
    scriptId: string;
};

type RunnerPayload = InspectPayload | RunPayload;

async function main() {
    const payload = parsePayload();
    const script = await loadScript(payload.filePath, payload.scriptId);

    if (payload.action === "inspect") {
        writeResult<ScriptInfo>({
            id: script.id,
            title: script.title,
            fileName: script.fileName,
            filePath: payload.filePath,
            button: script.button,
            lifecycles: script.lifecycles,
        });
        return;
    }

    const commands: ScriptCommandResult[] = [];
    const startedAt = performance.now();
    const commandApi: ScriptCommandApi = {
        runOnWorktree: async (command) => {
            const [error, result] = await tryPromise(
                runWorktreeCommand(payload.context.worktreePath, command),
            );

            if (error) {
                if (error instanceof RunnerCommandError) {
                    commands.push(error.result);
                }

                throw error;
            }

            commands.push(result);
            return result;
        },
    };
    const success = await script.execute(payload.context, commandApi);

    writeResult<ScriptRunResult>({
        scriptId: script.id,
        success,
        durationMs: Math.round(performance.now() - startedAt),
        commands,
    });
}

function parsePayload(): RunnerPayload {
    const payloadPath = process.argv[2];
    const rawPayload = payloadPath
        ? readPayloadFile(payloadPath)
        : process.env.PR_RUN_SCRIPT_PAYLOAD;

    if (!rawPayload) {
        throw new Error("Missing script runner payload.");
    }

    return JSON.parse(rawPayload) as RunnerPayload;
}

function readPayloadFile(payloadPath: string) {
    const payload = readFileSync(payloadPath, "utf8");
    unlinkSync(payloadPath);
    return payload;
}

async function loadScript(filePath: string, scriptId: string) {
    beginScriptRegistration(
        scriptId,
        filePath.split(/[\\/]/).pop() ?? filePath,
    );
    await import(pathToFileURL(filePath).href);
    const registration = finishScriptRegistration();

    if (!registration) {
        throw new Error("The script did not call registerScript.");
    }

    return registration;
}

async function runWorktreeCommand(
    worktreePath: string,
    command: string,
): Promise<ScriptCommandResult> {
    if (!command.trim()) {
        throw new Error("Command cannot be empty.");
    }

    const runsInUserTerminal = process.env.PR_RUN_SCRIPT_TERMINAL === "1";
    const childProcess = Bun.spawn(
        runsInUserTerminal ? shellCommand(command) : terminalCommand(command),
        {
            cwd: worktreePath,
            env: {
                ...processEnv(),
                TERM: "xterm-256color",
                COLORTERM: "truecolor",
                FORCE_COLOR: "1",
                CLICOLOR_FORCE: "1",
            },
            stderr: runsInUserTerminal ? "inherit" : "pipe",
            stdin: runsInUserTerminal ? "inherit" : "ignore",
            stdout: runsInUserTerminal ? "inherit" : "pipe",
        },
    );

    if (runsInUserTerminal) {
        const exitCode = await childProcess.exited;
        const result = { command, exitCode, stdout: "", stderr: "" };

        if (exitCode !== 0) {
            throw new RunnerCommandError(result);
        }

        return result;
    }

    const outputChunks: string[] = [];
    const [streamError] = await tryPromise(
        Promise.all([
            consumeProcessStream(childProcess.stdout!, (data) => {
                outputChunks.push(data);
                writeEvent({ type: "output", data });
            }),
            consumeProcessStream(childProcess.stderr!, (data) => {
                const coloredData = `\u001b[31m${data}\u001b[0m`;
                outputChunks.push(coloredData);
                writeEvent({ type: "output", data: coloredData });
            }),
        ]),
    );
    const exitCode = await childProcess.exited;
    const result = {
        command,
        exitCode,
        stdout: outputChunks.join(""),
        stderr: "",
    };

    if (streamError) {
        throw streamError;
    }

    if (exitCode !== 0) {
        throw new RunnerCommandError(result);
    }

    return result;
}

function shellCommand(command: string) {
    return [process.env.SHELL || "/bin/sh", "-lc", command];
}

function terminalCommand(command: string) {
    const scriptPath = Bun.which("script");

    if (!scriptPath) {
        return [process.env.SHELL || "/bin/sh", "-lc", command];
    }

    if (process.platform === "darwin") {
        return [
            scriptPath,
            "-q",
            "/dev/null",
            process.env.SHELL || "/bin/sh",
            "-lc",
            command,
        ];
    }

    return [scriptPath, "-qefc", command, "/dev/null"];
}

async function consumeProcessStream(
    stream: ReadableStream<Uint8Array>,
    onData: (data: string) => void,
) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            const remaining = decoder.decode();

            if (remaining) {
                onData(remaining);
            }

            return;
        }

        const data = decoder.decode(value, { stream: true });

        if (data) {
            onData(data);
        }
    }
}

class RunnerCommandError extends Error {
    result: ScriptCommandResult;

    constructor(result: ScriptCommandResult) {
        super(
            result.stdout.trim() ||
                `Command exited with code ${result.exitCode}.`,
        );
        this.name = "RunnerCommandError";
        this.result = result;
    }
}

function processEnv() {
    return Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
        ),
    );
}

function writeResult<T>(result: T) {
    if (process.env.PR_RUN_SCRIPT_TERMINAL === "1") {
        if ("success" in (result as object)) {
            const runResult = result as ScriptRunResult;
            const color = runResult.success ? "\u001b[32m" : "\u001b[31m";
            const status = runResult.success ? "completed" : "failed";
            process.stdout.write(
                `\r\n${color}Script ${status} in ${runResult.durationMs}ms.\u001b[0m\r\n`,
            );
        }
        return;
    }

    process.stdout.write(`${RESULT_MARKER}${JSON.stringify(result)}\n`);
}

function writeEvent(event: { type: "output"; data: string }) {
    process.stdout.write(`${EVENT_MARKER}${JSON.stringify(event)}\n`);
}

main().catch((error: unknown) => {
    const message =
        error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
});
