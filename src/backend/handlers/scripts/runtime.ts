import { tryPromise } from "@/backend/handlers/error";
import type { ScriptCommandResult, ScriptInfo } from "@/backend/types";

export type ScriptContext = {
    id: string;
    projectId: string;
    projectPath: string;
    branch: string;
    worktreePath: string;
};

export type ScriptCommandApi = {
    runOnWorktree: (command: string) => Promise<ScriptCommandResult>;
};

export type ScriptOptions = {
    title?: string;
    name?: string;
    button: boolean;
    lifecycles: string[];
};

export type ScriptExecute = (
    context: ScriptContext,
    command: ScriptCommandApi,
) => Promise<boolean>;

export type RegisteredScript = ScriptInfo & {
    execute: ScriptExecute;
};

type ActiveRegistration = {
    id: string;
    fileName: string;
    script?: RegisteredScript;
};

type ScriptRuntimeGlobal = typeof globalThis & {
    __prRunScriptRuntime?: {
        activeRegistration?: ActiveRegistration;
    };
};

const scriptRuntimeGlobal = globalThis as ScriptRuntimeGlobal;
scriptRuntimeGlobal.__prRunScriptRuntime ??= {};

function runtimeState() {
    return scriptRuntimeGlobal.__prRunScriptRuntime!;
}

export function beginScriptRegistration(id: string, fileName: string) {
    runtimeState().activeRegistration = { id, fileName };
}

export function finishScriptRegistration() {
    const registration = runtimeState().activeRegistration;
    runtimeState().activeRegistration = undefined;
    return registration?.script;
}

export function registerScript(options: ScriptOptions, execute: ScriptExecute) {
    const activeRegistration = runtimeState().activeRegistration;
    const title = options.title?.trim() || options.name?.trim();

    if (!activeRegistration) {
        throw new Error(
            "registerScript can only be called while loading a script.",
        );
    }

    if (activeRegistration.script) {
        throw new Error("A script file can only register one script.");
    }

    if (!title) {
        throw new Error("A script title is required.");
    }

    activeRegistration.script = {
        id: activeRegistration.id,
        fileName: activeRegistration.fileName,
        filePath: "",
        title,
        button: options.button,
        lifecycles: options.lifecycles,
        execute,
    };
}

export { tryPromise };
