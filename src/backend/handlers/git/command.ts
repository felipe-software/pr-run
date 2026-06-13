import { $ } from "bun";

import { tryPromise } from "@/backend/handlers/error";
import { logger } from "@/backend/logger";
import { clearSshPassphrase, getSshPassphrase } from "@/backend/ssh-passphrase";
import { ApiError } from "@/backend/types";

type GitCommand =
    | ["rev-parse", "--show-toplevel"]
    | ["rev-parse", "--verify", string]
    | ["fetch", "origin"]
    | ["symbolic-ref", "--quiet", "--short", string]
    | [
          "for-each-ref",
          "--sort=-committerdate",
          "--format=%(refname:short)|%(committerdate:unix)",
          "refs/remotes/origin",
      ]
    | ["for-each-ref", "--format=%(refname)", string]
    | ["worktree", "add", "--track", "-b", string, string, string]
    | ["worktree", "add", string, string]
    | ["worktree", "add", "--detach", string, string]
    | ["worktree", "remove", "--force", string]
    | ["reset", "--hard", string]
    | ["worktree", "list", "--porcelain"]
    | ["log", string, "--pretty=format:%H"]
    | ["diff", "--numstat", string]
    | ["diff", "--patch", string]
    | [
          "log",
          string,
          "-n",
          "30",
          "--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%cI",
      ];

type GitResultMode = "quiet" | "text";
type GitCommandStage = "git" | "git:sshpass";

const NON_INTERACTIVE_ENV = {
    ...process.env,
    LANG: "C",
    LANGUAGE: "C",
    LC_ALL: "C",
    LC_MESSAGES: "C",
    GIT_TERMINAL_PROMPT: "0",
    GIT_SSH_COMMAND:
        process.env.PR_RUN_GIT_SSH_COMMAND ??
        "ssh -o BatchMode=yes -o NumberOfPasswordPrompts=0",
};

export function gitCommandErrorText(error: unknown) {
    if (error instanceof Error) {
        const output = error as Error & { stderr?: Buffer; stdout?: Buffer };

        return [
            error.message,
            output.stderr?.toString("utf8"),
            output.stdout?.toString("utf8"),
        ]
            .filter(Boolean)
            .join("\n");
    }

    return String(error);
}

function errorDetails(error: unknown) {
    if (error instanceof Error) {
        const output = error as Error & {
            exitCode?: number;
            stderr?: Buffer;
            stdout?: Buffer;
        };

        return {
            name: error.name,
            message: error.message,
            exitCode: output.exitCode,
            stderr: output.stderr?.toString("utf8"),
            stdout: output.stdout?.toString("utf8"),
        };
    }

    return {
        message: String(error),
    };
}

function logGitError(
    projectPath: string,
    command: GitCommand,
    error: unknown,
    stage: GitCommandStage,
) {
    logger.error(
        {
            projectPath,
            command,
            stage,
            error: errorDetails(error),
        },
        "git command failed",
    );
}

export function isGitSshAuthFailure(error: unknown) {
    const text = gitCommandErrorText(error);

    return (
        text.includes("Permission denied") ||
        text.includes("publickey") ||
        text.includes("passphrase") ||
        text.includes("Enter passphrase") ||
        text.includes("Number of password prompts exceeded") ||
        text.includes("Could not read from remote repository")
    );
}

async function runGitCommand<T>(
    projectPath: string,
    command: GitCommand,
    stage: GitCommandStage,
    run: () => Promise<T>,
) {
    const [error, result] = await tryPromise(run());

    if (error) {
        logGitError(projectPath, command, error, stage);
        throw error;
    }

    return result;
}

async function hasSshpass() {
    const [error] = await tryPromise($`command -v sshpass`.quiet());
    return !error;
}

function runWithSshpass(
    projectPath: string,
    command: GitCommand,
    mode: "text",
): Promise<string>;
function runWithSshpass(
    projectPath: string,
    command: GitCommand,
    mode: "quiet",
): Promise<void>;
async function runWithSshpass(
    projectPath: string,
    command: GitCommand,
    mode: GitResultMode,
): Promise<string | void> {
    const passphrase = getSshPassphrase();

    if (!passphrase) {
        logger.warn(
            { projectPath, command, action: "prompt_ssh_passphrase" },
            "ssh passphrase required",
        );
        throw new ApiError(
            "SSH_AUTH_REQUIRED",
            "SSH needs a passphrase. Enter the SSH passphrase in the app.",
            401,
            undefined,
            { action: "prompt_ssh_passphrase" },
        );
    }

    if (!(await hasSshpass())) {
        throw new ApiError(
            "SSHPASS_NOT_FOUND",
            "sshpass is not installed. Install sshpass or load your key into ssh-agent.",
            500,
        );
    }

    const prompt = process.env.PR_RUN_SSHPASS_PROMPT ?? "Enter passphrase";

    logger.warn(
        { projectPath, command },
        "git requested a passphrase; retrying with sshpass",
    );

    const shell =
        $`setsid sshpass -P ${prompt} -p ${passphrase} git -C ${projectPath} ${command}`.env(
            {
                ...NON_INTERACTIVE_ENV,
                GIT_SSH_COMMAND:
                    process.env.PR_RUN_GIT_SSH_COMMAND_WITH_SSHPASS ??
                    "ssh -o NumberOfPasswordPrompts=1",
            },
        );

    if (mode === "text") {
        const [error, output] = await tryPromise(
            runGitCommand(projectPath, command, "git:sshpass", () =>
                shell.text(),
            ),
        );

        if (error) {
            handleSshpassError(projectPath, command, error);
        }

        return output;
    }

    const [error] = await tryPromise(
        runGitCommand(projectPath, command, "git:sshpass", async () => {
            await shell.quiet();
        }),
    );

    if (error) {
        handleSshpassError(projectPath, command, error);
    }
}

export async function gitQuiet(projectPath: string, command: GitCommand) {
    logger.debug({ projectPath, command }, "git quiet");

    const [error] = await tryPromise(
        runGitCommand(projectPath, command, "git", async () => {
            await $`git -C ${projectPath} ${command}`
                .env(NON_INTERACTIVE_ENV)
                .quiet();
        }),
    );

    if (!error) {
        return;
    }

    if (isGitSshAuthFailure(error)) {
        await runWithSshpass(projectPath, command, "quiet");
        return;
    }

    throw error;
}

export async function gitText(projectPath: string, command: GitCommand) {
    logger.debug({ projectPath, command }, "git text");

    const [error, output] = await tryPromise(
        runGitCommand(
            projectPath,
            command,
            "git",
            async () =>
                await $`git -C ${projectPath} ${command}`
                    .env(NON_INTERACTIVE_ENV)
                    .text(),
        ),
    );

    if (!error) {
        return output;
    }

    if (isGitSshAuthFailure(error)) {
        return await runWithSshpass(projectPath, command, "text");
    }

    throw error;
}

function handleSshpassError(
    projectPath: string,
    command: GitCommand,
    error: unknown,
): never {
    if (isGitSshAuthFailure(error)) {
        clearSshPassphrase();
        logger.warn(
            { projectPath, command, action: "prompt_ssh_passphrase" },
            "ssh passphrase rejected",
        );
        throw new ApiError(
            "SSH_AUTH_REQUIRED",
            "SSH passphrase was rejected. Enter the SSH passphrase again.",
            401,
            gitCommandErrorText(error),
            { action: "prompt_ssh_passphrase" },
        );
    }

    throw error;
}
