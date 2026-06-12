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

export type ApiErrorCode =
    | "INVALID_PROJECT_PATH"
    | "NOT_A_GIT_REPOSITORY"
    | "ORIGIN_NOT_FOUND"
    | "BRANCH_NOT_FOUND"
    | "WORKTREE_NOT_FOUND"
    | "WORKTREE_EXISTS_INVALID"
    | "SSHPASS_NOT_FOUND"
    | "SSH_AUTH_REQUIRED"
    | "GIT_COMMAND_FAILED"
    | "CONFIG_READ_FAILED"
    | "CONFIG_WRITE_FAILED"
    | "PROJECT_NOT_FOUND"
    | "BAD_REQUEST"
    | "NOT_FOUND";

export type ApiMetadata = Record<string, string | number | boolean | undefined>;

export type ApiEnvelope<T> = {
    type: "error" | "success";
    message: string;
    data: T[];
    _metadata: ApiMetadata;
};

export class ApiError extends Error {
    code: ApiErrorCode;
    details?: string;
    metadata?: ApiMetadata;
    status: number;

    constructor(
        code: ApiErrorCode,
        message: string,
        status = 400,
        details?: string,
        metadata?: ApiMetadata,
    ) {
        super(message);
        this.name = "ApiError";
        this.code = code;
        this.details = details;
        this.metadata = metadata;
        this.status = status;
    }
}
