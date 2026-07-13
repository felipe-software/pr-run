import type { ApiMetadata } from "@/types/pr-run";

export type * from "@/types/pr-run";

export type ApiErrorCode =
    | "INVALID_PROJECT_PATH"
    | "NOT_A_GIT_REPOSITORY"
    | "ORIGIN_NOT_FOUND"
    | "BRANCH_NOT_FOUND"
    | "COMMIT_NOT_FOUND"
    | "FILE_NOT_FOUND"
    | "WORKTREE_NOT_FOUND"
    | "WORKTREE_EXISTS_INVALID"
    | "SSHPASS_NOT_FOUND"
    | "SSH_AUTH_REQUIRED"
    | "GIT_COMMAND_FAILED"
    | "CONFIG_READ_FAILED"
    | "CONFIG_WRITE_FAILED"
    | "PROJECT_NOT_FOUND"
    | "SCRIPT_NOT_FOUND"
    | "SCRIPT_CREATE_FAILED"
    | "SCRIPT_DELETE_FAILED"
    | "SCRIPT_LOAD_FAILED"
    | "SCRIPT_EXECUTION_FAILED"
    | "EDITOR_NOT_FOUND"
    | "EDITOR_LAUNCH_FAILED"
    | "DOCKER_UNAVAILABLE"
    | "DOCKER_COMPOSE_FILE_NOT_FOUND"
    | "DOCKER_INSPECT_FAILED"
    | "DOCKER_SERVICE_NOT_FOUND"
    | "ENV_FILES_READ_FAILED"
    | "GITHUB_INTEGRATION_FAILED"
    | "PACKAGE_SCRIPT_NOT_FOUND"
    | "PACKAGE_SCRIPTS_READ_FAILED"
    | "REVIEW_NOT_FOUND"
    | "TERMINAL_SESSION_FAILED"
    | "BAD_REQUEST"
    | "NOT_FOUND";

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
