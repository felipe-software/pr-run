import { contextBridge, ipcRenderer } from "electron";

import type {
    BranchInfo,
    CheckoutResult,
    CommitInfo,
    ProjectConfig,
    ProjectsConfig,
    RemoveWorktreeResult,
    SshPassphraseResult,
    TerminalCreateOptions,
    TerminalDataEvent,
    TerminalExitEvent,
    TerminalInputOptions,
    TerminalSession,
    TerminalSessionSnapshot,
    UpdateResult,
    UpdateWorktreesResult,
} from "./types.js";

type ApiEnvelope<T> = {
    type: "success" | "error";
    message: string;
    data: T[];
    _metadata: Record<string, unknown>;
};

let backendUrlPromise: Promise<string> | null = null;

function getBackendUrl() {
    backendUrlPromise ??= ipcRenderer.invoke(
        "backend:getUrl",
    ) as Promise<string>;
    return backendUrlPromise;
}

async function requestEnvelope<T>(
    path: string,
    init?: RequestInit,
): Promise<ApiEnvelope<T>> {
    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}${path}`, {
        ...init,
        headers: {
            "content-type": "application/json",
            ...init?.headers,
        },
    });
    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || payload.type === "error") {
        const message = payload.message || "Local API request failed.";
        const error = new Error(message);

        Object.assign(error, {
            code: payload._metadata?.code,
            details: payload._metadata?.details,
            action: payload._metadata?.action,
            metadata: payload._metadata,
        });

        throw error;
    }

    return payload;
}

async function requestOne<T>(path: string, init?: RequestInit): Promise<T> {
    const payload = await requestEnvelope<T>(path, init);
    const item = payload.data[0];

    if (item === undefined) {
        throw new Error(payload.message || "Local API returned no data.");
    }

    return item;
}

async function requestMany<T>(path: string, init?: RequestInit): Promise<T[]> {
    const payload = await requestEnvelope<T>(path, init);
    return payload.data;
}

contextBridge.exposeInMainWorld("prRun", {
    async getBackendUrl() {
        return getBackendUrl();
    },
    async getConfig() {
        return requestOne<ProjectsConfig>("/config");
    },
    async addProject(projectPath: string) {
        return requestOne<ProjectConfig>("/projects", {
            method: "POST",
            body: JSON.stringify({ path: projectPath }),
        });
    },
    async listBranches(projectId: string) {
        return requestMany<BranchInfo>(
            `/projects/${encodeURIComponent(projectId)}/branches`,
        );
    },
    async checkoutBranch(projectId: string, branch: string) {
        return requestOne<CheckoutResult>(
            `/projects/${encodeURIComponent(projectId)}/checkout`,
            {
                method: "POST",
                body: JSON.stringify({ branch }),
            },
        );
    },
    async updateWorktree(projectId: string, branch: string) {
        return requestOne<UpdateResult>(
            `/projects/${encodeURIComponent(projectId)}/update`,
            {
                method: "POST",
                body: JSON.stringify({ branch }),
            },
        );
    },
    async removeWorktree(projectId: string, branch: string) {
        return requestOne<RemoveWorktreeResult>(
            `/projects/${encodeURIComponent(projectId)}/worktree`,
            {
                method: "DELETE",
                body: JSON.stringify({ branch }),
            },
        );
    },
    async updateProjectWorktrees(projectId: string) {
        return requestOne<UpdateWorktreesResult>(
            `/projects/${encodeURIComponent(projectId)}/update-worktrees`,
            {
                method: "POST",
            },
        );
    },
    async getCommitHistory(projectId: string, branch: string) {
        const params = new URLSearchParams({ branch });

        return requestMany<CommitInfo>(
            `/projects/${encodeURIComponent(projectId)}/commits?${params}`,
        );
    },
    async setSshPassphrase(passphrase: string) {
        return requestOne<SshPassphraseResult>("/ssh-passphrase", {
            method: "POST",
            body: JSON.stringify({ passphrase }),
        });
    },
    async clearSshPassphrase() {
        return requestOne<SshPassphraseResult>("/ssh-passphrase/clear", {
            method: "POST",
        });
    },
    async createTerminalSession(options: TerminalCreateOptions) {
        return ipcRenderer.invoke(
            "terminal:create",
            options,
        ) as Promise<TerminalSession>;
    },
    async getTerminalSessionSnapshot(id: string) {
        return ipcRenderer.invoke(
            "terminal:getSnapshot",
            id,
        ) as Promise<TerminalSessionSnapshot>;
    },
    async getTerminalSessionState(id: string) {
        return ipcRenderer.invoke("terminal:getState", id) as Promise<
            Pick<
                TerminalSessionSnapshot,
                "id" | "isAlive" | "busyState" | "sequence" | "currentProcess"
            >
        >;
    },
    async writeTerminalInput(
        id: string,
        data: string,
        options?: TerminalInputOptions,
    ) {
        await ipcRenderer.invoke("terminal:input", id, data, options);
    },
    async resizeTerminal(id: string, cols: number, rows: number) {
        await ipcRenderer.invoke("terminal:resize", id, cols, rows);
    },
    async disposeTerminalSession(id: string) {
        await ipcRenderer.invoke("terminal:dispose", id);
    },
    onTerminalData(callback: (event: TerminalDataEvent) => void) {
        const listener = (
            _event: Electron.IpcRendererEvent,
            data: TerminalDataEvent,
        ) => {
            callback(data);
        };

        ipcRenderer.on("terminal:data", listener);

        return () => {
            ipcRenderer.off("terminal:data", listener);
        };
    },
    onTerminalExit(callback: (event: TerminalExitEvent) => void) {
        const listener = (
            _event: Electron.IpcRendererEvent,
            data: TerminalExitEvent,
        ) => {
            callback(data);
        };

        ipcRenderer.on("terminal:exit", listener);

        return () => {
            ipcRenderer.off("terminal:exit", listener);
        };
    },
});
