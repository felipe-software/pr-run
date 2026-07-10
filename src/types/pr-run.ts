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
    source: "branch" | "pull-request";
    compareBranchName?: string;
    repository?: GitHubRepositoryInfo;
    pullRequest?: PullRequestInfo;
};

export type GitHubRepositoryInfo = {
    nameWithOwner: string;
    url: string;
};

export type GitHubUserInfo = {
    login: string;
    url: string;
    avatarUrl: string;
};

export type PullRequestInfo = {
    additions?: number;
    assignees: GitHubUserInfo[];
    author?: GitHubUserInfo;
    baseBranchName: string;
    changedFiles?: number;
    deletions?: number;
    isDraft: boolean;
    latestReviews: PullRequestLatestReview[];
    number: number;
    reviewRequests: GitHubUserInfo[];
    state: PullRequestState;
    title: string;
    url: string;
};

export type PullRequestState = "OPEN" | "CLOSED" | "MERGED";

export type PullRequestLatestReview = {
    author: GitHubUserInfo;
    state: PullRequestReviewState;
};

export type BranchDiffFile = {
    path: string;
    additions: number;
    deletions: number;
    previousPath?: string;
    status: "added" | "binary" | "deleted" | "modified" | "renamed";
};

export type BranchDiffResult = {
    additions: number;
    branch: string;
    deletions: number;
    files: BranchDiffFile[];
    patch: string;
};

export type DockerServiceState =
    | "created"
    | "dead"
    | "exited"
    | "not-created"
    | "paused"
    | "restarting"
    | "running"
    | "unknown";

export type DockerServiceSummary = {
    containerName?: string;
    health?: string;
    isRunning: boolean;
    name: string;
    state: DockerServiceState;
    statusText?: string;
};

export type DockerOverviewResult = {
    branch: string;
    composeCli: string | null;
    composeFilePath: string | null;
    services: DockerServiceSummary[];
    worktreePath: string;
};

export type DockerTerminalCommandAction = "down" | "logs" | "restart" | "up";

export type DockerTerminalCommandResult = {
    action: DockerTerminalCommandAction;
    command: string;
    serviceName?: string;
};

export type EnvFileItem = {
    content?: string;
    isSymbolicLink: boolean;
    linkedPath?: string;
    name: string;
    readError?: string;
};

export type EnvFilesOverviewResult = {
    branch: string;
    files: EnvFileItem[];
    worktreePath: string;
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
    additions?: number;
    hash: string;
    shortHash: string;
    subject: string;
    authorName: string;
    authorEmail: string;
    authorAvatarUrl?: string;
    authorLogin?: string;
    authorUrl?: string;
    date: string;
    deletions?: number;
    hasBinaryChanges?: boolean;
    url?: string;
    isInSelectedBranch: boolean;
};

export type PullRequestReviewState =
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED"
    | "PENDING";

export type PullRequestReviewComment = {
    author: GitHubUserInfo;
    body: string;
    createdAt: string;
    id: number;
    isOutdated: boolean;
    line?: number;
    path: string;
    pullRequestReviewId?: number;
    side?: "LEFT" | "RIGHT";
    startLine?: number;
    startSide?: "LEFT" | "RIGHT";
    subjectType: "file" | "line";
    url: string;
    viewerDidAuthor: boolean;
};

export type PullRequestReviewActivity = {
    author: GitHubUserInfo;
    body: string;
    comments: PullRequestReviewComment[];
    id: string;
    state: PullRequestReviewState;
    submittedAt: string;
    url?: string;
};

export type PullRequestGeneralComment = {
    author: GitHubUserInfo;
    body: string;
    createdAt: string;
    id: string;
    url: string;
    viewerDidAuthor: boolean;
};

export type WorktreeActivityItem =
    | {
          commit: CommitInfo;
          id: string;
          occurredAt: string;
          type: "commit";
      }
    | {
          comment: PullRequestGeneralComment;
          id: string;
          occurredAt: string;
          type: "comment";
      }
    | {
          id: string;
          occurredAt: string;
          review: PullRequestReviewActivity;
          type: "review";
      };

export type GitHubIntegrationStatus =
    | { status: "available" }
    | {
          message: string;
          reason:
              | "not-a-pull-request"
              | "not-authenticated"
              | "pull-request-mismatch"
              | "pull-request-not-found"
              | "request-failed";
          status: "unavailable";
      };

export type PendingPullRequestReview = {
    body: string;
    comments: PullRequestReviewComment[];
    id: number;
    nodeId: string;
};

export type WorktreeActivityResult = {
    baseCommits: CommitInfo[];
    integration: GitHubIntegrationStatus;
    items: WorktreeActivityItem[];
    pendingReview?: PendingPullRequestReview;
    reviewComments: PullRequestReviewComment[];
    reviewDecision?: string;
    viewer?: GitHubUserInfo;
};

export type ReviewCommentMode = "immediate" | "pending";

export type ReviewEvent = "APPROVE" | "COMMENT" | "REQUEST_CHANGES";

export type PullRequestReviewMutationResult = {
    id: number | string;
    url?: string;
};

export type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

export type PackageScriptInfo = {
    command: string;
    name: string;
    packageName: string;
    packagePath: string;
    quick: boolean;
};

export type PackageScriptGroup = {
    name: string;
    path: string;
    scripts: PackageScriptInfo[];
};

export type PackageScriptCatalog = {
    manager: PackageManager;
    packages: PackageScriptGroup[];
    quickScripts: PackageScriptInfo[];
};

export type PackageScriptTerminalCommandResult = {
    command: string;
    title: string;
};

export type ScriptInfo = {
    id: string;
    title: string;
    fileName: string;
    filePath: string;
    button: boolean;
    lifecycles: string[];
    loadError?: string;
};

export type ScriptSourceResult = {
    scriptId: string;
    filePath: string;
    source: string;
};

export type ScriptCommandResult = {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
};

export type ScriptRunResult = {
    scriptId: string;
    success: boolean;
    durationMs: number;
    commands: ScriptCommandResult[];
};

export type ScriptTerminalCommandResult = {
    command: string;
};

export type TextFileLocation = {
    filePath: string;
    line?: number;
    column?: number;
};

export type ScriptOpenResult = {
    editor: string;
};

export type ScriptStreamEvent =
    | { type: "output"; data: string }
    | { type: "error"; message: string };

export type SshPassphraseResult = {
    ok: true;
};

export type TerminalCreateOptions = {
    cwd: string;
    cols: number;
    rows: number;
};

export type TerminalBusyState = "idle" | "busy" | "unknown";

export type TerminalSession = {
    id: string;
    shell: string;
    cwd: string;
    currentProcess: string;
    isAlive: boolean;
    busyState: TerminalBusyState;
    sequence: number;
};

export type TerminalSessionSnapshot = {
    id: string;
    shell: string;
    cwd: string;
    currentProcess: string;
    isAlive: boolean;
    busyState: TerminalBusyState;
    sequence: number;
    history: string;
    exitCode?: number;
    signal?: number;
};

export type TerminalInputOptions = {
    source?: "keyboard" | "script";
};

export type TerminalDataEvent = {
    id: string;
    data: string;
    currentProcess: string;
    sequence: number;
};

export type TerminalExitEvent = {
    id: string;
    exitCode: number;
    signal?: number;
    currentProcess: string;
    sequence: number;
};

export type ApiMetadata = Record<string, unknown>;

export type ApiEnvelope<T> = {
    type: "error" | "success";
    message: string;
    data: T[];
    _metadata: ApiMetadata;
};
