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
    TerminalSession,
    UpdateResult,
} from "@/types/pr-run";

declare global {
    interface Window {
        prRun: {
            getBackendUrl(): Promise<string>;
            getConfig(): Promise<ProjectsConfig>;
            addProject(path: string): Promise<ProjectConfig>;
            listBranches(projectId: string): Promise<BranchInfo[]>;
            checkoutBranch(
                projectId: string,
                branch: string,
            ): Promise<CheckoutResult>;
            updateWorktree(
                projectId: string,
                branch: string,
            ): Promise<UpdateResult>;
            removeWorktree(
                projectId: string,
                branch: string,
            ): Promise<RemoveWorktreeResult>;
            updateProjectWorktrees(
                projectId: string,
            ): Promise<import("./pr-run").UpdateWorktreesResult>;
            getCommitHistory(
                projectId: string,
                branch: string,
            ): Promise<CommitInfo[]>;
            setSshPassphrase(passphrase: string): Promise<SshPassphraseResult>;
            clearSshPassphrase(): Promise<SshPassphraseResult>;
            createTerminalSession(
                options: TerminalCreateOptions,
            ): Promise<TerminalSession>;
            writeTerminalInput(id: string, data: string): Promise<void>;
            resizeTerminal(
                id: string,
                cols: number,
                rows: number,
            ): Promise<void>;
            disposeTerminalSession(id: string): Promise<void>;
            onTerminalData(
                callback: (event: TerminalDataEvent) => void,
            ): () => void;
            onTerminalExit(
                callback: (event: TerminalExitEvent) => void,
            ): () => void;
        };
    }
}

export {};
