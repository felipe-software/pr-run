export type ProjectGroup = {
    id: string;
    name: string;
    collapsed: boolean;
    projects: ProjectConfig[];
};

export type ProjectConfig = {
    id: string;
    name: string;
    path: string;
};

export type ProjectsConfig = {
    groups: ProjectGroup[];
};

export type BranchInfo = {
    name: string;
    remoteName: string;
    worktreePath: string;
    hasWorktree: boolean;
    lastCommitTimestamp: number | null;
    isStale: boolean;
};

export type CheckoutResult =
    | {
          status: "created";
          branch: string;
          worktreePath: string;
          message: string;
      }
    | {
          status: "ready";
          branch: string;
          worktreePath: string;
          message: "worktree ready";
      };

export type UpdateResult = {
    status: "updated";
    branch: string;
    worktreePath: string;
    message: string;
};

export type RemoveWorktreeResult = {
    status: "removed";
    branch: string;
    worktreePath: string;
    message: string;
};

export type UpdateWorktreesResult = {
    status: "updated";
    updatedCount: number;
    skippedCount: number;
    message: string;
};

export type CommitInfo = {
    hash: string;
    shortHash: string;
    subject: string;
    authorName: string;
    authorEmail: string;
    date: string;
    isInSelectedBranch: boolean;
};

export type SshPassphraseResult = {
    ok: true;
};

export type TerminalCreateOptions = {
    cwd: string;
    cols: number;
    rows: number;
};

export type TerminalSession = {
    id: string;
    shell: string;
    cwd: string;
};

export type TerminalDataEvent = {
    id: string;
    data: string;
};

export type TerminalExitEvent = {
    id: string;
    exitCode: number;
    signal?: number;
};

export type ApiMetadata = Record<string, unknown>;

export type ApiEnvelope<T> = {
    type: "error" | "success";
    message: string;
    data: T[];
    _metadata: ApiMetadata;
};
