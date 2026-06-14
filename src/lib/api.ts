import ky, { type AfterResponseState, type Options } from "ky";

import type {
    ApiEnvelope,
    BranchDiffResult,
    BranchInfo,
    CheckoutResult,
    CommitInfo,
    ProjectConfig,
    ProjectsConfig,
    RemoveWorktreeResult,
    ScriptInfo,
    ScriptOpenResult,
    ScriptRunResult,
    ScriptSourceResult,
    ScriptStreamEvent,
    ScriptTerminalCommandResult,
    SshPassphraseResult,
    UpdateResult,
    UpdateWorktreesResult,
} from "@/types/pr-run";
import {
    type PendingRequest,
    useSshPassphraseStore,
} from "@/lib/hooks/store/use-ssh-passphrase-store";

type ApiError = Error & {
    action?: string;
    code?: string;
    details?: unknown;
    handledBySshPrompt?: boolean;
    metadata?: Record<string, unknown>;
    status?: number;
};

const api = ky.create({
    hooks: {
        afterResponse: [
            async ({ request, response }: AfterResponseState) => {
                const payload = await parseEnvelope(response);

                if (response.ok && payload?.type !== "error") {
                    return response;
                }

                const error = createApiError(response, payload);

                if (isSshPromptError(error)) {
                    await clearSshPassphraseCache();
                    useSshPassphraseStore
                        .getState()
                        .open(await capturePendingRequest(request));
                    error.handledBySshPrompt = true;
                }

                throw error;
            },
        ],
    },
    throwHttpErrors: false,
});

const rawApi = ky.create({
    throwHttpErrors: false,
});

const SCRIPT_RESULT_MARKER = "__PR_RUN_SCRIPT_RESULT__";
const SCRIPT_EVENT_MARKER = "__PR_RUN_SCRIPT_EVENT__";

let backendUrlPromise: Promise<string> | null = null;

function getBackendUrl() {
    backendUrlPromise ??= window.prRun.getBackendUrl();
    return backendUrlPromise;
}

async function toApiUrl(pathOrUrl: string) {
    if (isAbsoluteUrl(pathOrUrl)) {
        return pathOrUrl;
    }

    return new URL(pathOrUrl, await getBackendUrl()).toString();
}

function isAbsoluteUrl(value: string) {
    try {
        return Boolean(new URL(value));
    } catch {
        return false;
    }
}

async function parseEnvelope<T>(response: Response) {
    try {
        return (await response.clone().json()) as ApiEnvelope<T>;
    } catch {
        return null;
    }
}

function createApiError(
    response: Response,
    payload: ApiEnvelope<unknown> | null,
): ApiError {
    const message =
        payload?.message || response.statusText || "Local API request failed.";
    const error = new Error(message) as ApiError;

    error.action =
        typeof payload?._metadata?.action === "string"
            ? payload._metadata.action
            : undefined;
    error.code =
        typeof payload?._metadata?.code === "string"
            ? payload._metadata.code
            : undefined;
    error.details = payload?._metadata?.details;
    error.metadata = payload?._metadata;
    error.status = response.status;

    return error;
}

async function capturePendingRequest(
    request: Request,
): Promise<PendingRequest> {
    const cloned = request.clone();
    const body = await cloned.text();

    return {
        body: body || undefined,
        contentType: cloned.headers.get("content-type") ?? undefined,
        method: cloned.method,
        url: cloned.url,
    };
}

async function send(pathOrUrl: string, options?: Options) {
    return api(await toApiUrl(pathOrUrl), options);
}

async function sendRaw(pathOrUrl: string, options?: Options) {
    return rawApi(await toApiUrl(pathOrUrl), options);
}

async function requestEnvelope<T>(pathOrUrl: string, options?: Options) {
    const response = await send(pathOrUrl, options);
    const payload = (await response.json()) as ApiEnvelope<T>;

    if (payload.type === "error") {
        throw createApiError(response, payload);
    }

    return payload;
}

async function requestOne<T>(pathOrUrl: string, options?: Options) {
    const payload = await requestEnvelope<T>(pathOrUrl, options);
    const item = payload.data[0];

    if (item === undefined) {
        throw new Error(payload.message || "Local API returned no data.");
    }

    return item;
}

async function requestMany<T>(pathOrUrl: string, options?: Options) {
    const payload = await requestEnvelope<T>(pathOrUrl, options);
    return payload.data;
}

async function clearSshPassphraseCache() {
    try {
        await requestOneRaw<SshPassphraseResult>("/ssh-passphrase/clear", {
            method: "POST",
        });
    } catch {
        // Clearing a stale passphrase is best-effort only.
    }
}

async function requestOneRaw<T>(pathOrUrl: string, options?: Options) {
    const response = await sendRaw(pathOrUrl, options);
    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || payload.type === "error") {
        throw createApiError(response, payload);
    }

    const item = payload.data[0];

    if (item === undefined) {
        throw new Error(payload.message || "Local API returned no data.");
    }

    return item;
}

export function isSshPromptError(error: unknown) {
    return (
        (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            String((error as { code: unknown }).code) ===
                "SSH_AUTH_REQUIRED") ||
        (typeof error === "object" &&
            error !== null &&
            "action" in error &&
            String((error as { action: unknown }).action) ===
                "prompt_ssh_passphrase")
    );
}

export function isHandledSshPromptError(error: unknown) {
    return (
        isSshPromptError(error) &&
        typeof error === "object" &&
        error !== null &&
        "handledBySshPrompt" in error &&
        Boolean((error as { handledBySshPrompt?: unknown }).handledBySshPrompt)
    );
}

export async function saveSshPassphrase() {
    const store = useSshPassphraseStore.getState();

    if (!store.passphrase) {
        store.setError("Enter the SSH passphrase.");
        return false;
    }

    try {
        store.setSaving(true);
        store.setError(undefined);
        await requestOneRaw<SshPassphraseResult>("/ssh-passphrase", {
            json: { passphrase: store.passphrase },
            method: "POST",
        });

        const { pendingRequest, retryAction } =
            useSshPassphraseStore.getState();

        if (retryAction) {
            await retryAction();
        } else if (pendingRequest) {
            await retryPendingRequest(pendingRequest);
        }

        useSshPassphraseStore.getState().close();
        return true;
    } catch (error) {
        if (isHandledSshPromptError(error)) {
            return false;
        }

        store.setError(errorMessage(error));
        return false;
    } finally {
        useSshPassphraseStore.getState().setSaving(false);
    }
}

async function retryPendingRequest(pendingRequest: PendingRequest) {
    await requestEnvelope(pendingRequest.url, {
        body: pendingRequest.body,
        headers: pendingRequest.contentType
            ? { "content-type": pendingRequest.contentType }
            : undefined,
        method: pendingRequest.method,
    });
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export const prRunApi = {
    addProject(projectPath: string) {
        return requestOne<ProjectConfig>("/projects", {
            json: { path: projectPath },
            method: "POST",
        });
    },
    checkoutBranch(projectId: string, branch: string) {
        return requestOne<CheckoutResult>(
            `/projects/${encodeURIComponent(projectId)}/checkout`,
            {
                json: { branch },
                method: "POST",
            },
        );
    },
    clearSshPassphrase: clearSshPassphraseCache,
    createScript(title: string) {
        return requestOne<ScriptInfo>("/scripts", {
            json: { title },
            method: "POST",
        });
    },
    deleteScript(scriptId: string) {
        return requestOne<ScriptInfo>(
            `/scripts/${encodeURIComponent(scriptId)}`,
            { method: "DELETE" },
        );
    },
    getCommitHistory(projectId: string, branch: string) {
        return requestMany<CommitInfo>(
            `/projects/${encodeURIComponent(projectId)}/commits?${new URLSearchParams({ branch }).toString()}`,
        );
    },
    getBranchDiff(projectId: string, branch: string) {
        return requestOne<BranchDiffResult>(
            `/projects/${encodeURIComponent(projectId)}/diff?${new URLSearchParams({ branch }).toString()}`,
        );
    },
    getConfig() {
        return requestOne<ProjectsConfig>("/config");
    },
    listBranches(projectId: string) {
        return requestMany<BranchInfo>(
            `/projects/${encodeURIComponent(projectId)}/branches`,
        );
    },
    listScripts() {
        return requestMany<ScriptInfo>("/scripts");
    },
    openScript(scriptId: string) {
        return requestOne<ScriptOpenResult>(
            `/scripts/${encodeURIComponent(scriptId)}/open`,
            { method: "POST" },
        );
    },
    prepareScriptTerminalCommand(
        projectId: string,
        branch: string,
        scriptId: string,
    ) {
        return requestOne<ScriptTerminalCommandResult>(
            `/projects/${encodeURIComponent(projectId)}/scripts/${encodeURIComponent(scriptId)}/terminal-command`,
            {
                json: { branch },
                method: "POST",
            },
        );
    },
    getScriptSource(scriptId: string) {
        return requestOne<ScriptSourceResult>(
            `/scripts/${encodeURIComponent(scriptId)}/source`,
        );
    },
    removeWorktree(projectId: string, branch: string) {
        return requestOne<RemoveWorktreeResult>(
            `/projects/${encodeURIComponent(projectId)}/worktree`,
            {
                json: { branch },
                method: "DELETE",
            },
        );
    },
    saveSshPassphrase,
    runScript(projectId: string, branch: string, scriptId: string) {
        return requestOne<ScriptRunResult>(
            `/projects/${encodeURIComponent(projectId)}/scripts/${encodeURIComponent(scriptId)}/run`,
            {
                json: { branch },
                method: "POST",
            },
        );
    },
    async runScriptStream(
        projectId: string,
        branch: string,
        scriptId: string,
        onEvent: (event: ScriptStreamEvent) => void,
    ) {
        const response = await sendRaw(
            `/projects/${encodeURIComponent(projectId)}/scripts/${encodeURIComponent(scriptId)}/run/stream`,
            {
                json: { branch },
                method: "POST",
                timeout: false,
            },
        );

        if (!response.ok) {
            const payload = await parseEnvelope(response);
            throw createApiError(response, payload);
        }

        if (!response.body) {
            throw new Error("Script stream is unavailable.");
        }

        return await consumeScriptStream(response.body, onEvent);
    },
    updateProjectWorktrees(projectId: string) {
        return requestOne<UpdateWorktreesResult>(
            `/projects/${encodeURIComponent(projectId)}/update-worktrees`,
            {
                method: "POST",
            },
        );
    },
    updateScriptSource(scriptId: string, source: string) {
        return requestOne<ScriptInfo>(
            `/scripts/${encodeURIComponent(scriptId)}/source`,
            {
                json: { source },
                method: "PUT",
            },
        );
    },
    updateWorktree(projectId: string, branch: string) {
        return requestOne<UpdateResult>(
            `/projects/${encodeURIComponent(projectId)}/update`,
            {
                json: { branch },
                method: "POST",
            },
        );
    },
};

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
                continue;
            }

            if (line.startsWith(SCRIPT_EVENT_MARKER)) {
                onEvent(
                    JSON.parse(
                        line.slice(SCRIPT_EVENT_MARKER.length),
                    ) as ScriptStreamEvent,
                );
                continue;
            }

            if (line) {
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
