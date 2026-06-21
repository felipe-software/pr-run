import { readdir } from "node:fs/promises";
import path from "node:path";

import { tryPromise } from "@/backend/handlers/error";
import { exists, worktreePathFor } from "@/backend/handlers/git/helpers";
import { logger } from "@/backend/logger";
import {
    ApiError,
    type DockerOverviewResult,
    type DockerServiceState,
    type DockerServiceSummary,
    type DockerTerminalCommandAction,
    type DockerTerminalCommandResult,
    type ProjectConfig,
} from "@/backend/types";

const COMPOSE_FILE_NAMES = [
    "compose.yaml",
    "compose.yml",
    "docker-compose.yml",
    "docker-compose.yaml",
] as const;

const SKIPPED_DIRECTORIES = new Set([
    ".git",
    ".next",
    ".pr-run",
    ".turbo",
    ".yarn",
    "build",
    "coverage",
    "dist",
    "node_modules",
]);
const COMPOSE_SEARCH_MAX_DEPTH = 3;

type ComposeCli = {
    label: string;
    prefix: string[];
};

type ComposeFile = {
    absolutePath: string;
    relativePath: string;
};

type ComposePsEntry = {
    containerName?: string;
    health?: string;
    service: string;
    state: DockerServiceState;
    statusText?: string;
};

export async function getDockerOverview(
    project: ProjectConfig,
    branch: string,
): Promise<DockerOverviewResult> {
    const worktreePath = await getWorktreePath(project, branch);
    const composeFile = await findComposeFile(worktreePath);

    if (!composeFile) {
        return {
            branch,
            composeCli: null,
            composeFilePath: null,
            services: [],
            worktreePath,
        };
    }

    const composeCli = await resolveComposeCli(worktreePath);
    const [servicesError, services] = await tryPromise(
        listComposeServices(composeCli, worktreePath, composeFile.relativePath),
    );

    if (servicesError) {
        throw new ApiError(
            "DOCKER_INSPECT_FAILED",
            "Failed to inspect Docker Compose services.",
            500,
            servicesError.message,
        );
    }

    const [statusError, statusEntries] = await tryPromise(
        listComposeStatus(composeCli, worktreePath, composeFile.relativePath),
    );

    if (statusError) {
        throw new ApiError(
            "DOCKER_INSPECT_FAILED",
            "Failed to inspect Docker Compose container status.",
            500,
            statusError.message,
        );
    }

    return {
        branch,
        composeCli: composeCli.label,
        composeFilePath: composeFile.relativePath,
        services: buildServiceSummaries(services, statusEntries),
        worktreePath,
    };
}

export async function prepareTerminalCommand(
    project: ProjectConfig,
    branch: string,
    action: DockerTerminalCommandAction,
    service?: string,
): Promise<DockerTerminalCommandResult> {
    const worktreePath = await getWorktreePath(project, branch);
    const composeFile = await requireComposeFile(worktreePath);
    const composeCli = await resolveComposeCli(worktreePath);

    if (service) {
        const [servicesError, services] = await tryPromise(
            listComposeServices(
                composeCli,
                worktreePath,
                composeFile.relativePath,
            ),
        );

        if (servicesError) {
            throw new ApiError(
                "DOCKER_INSPECT_FAILED",
                "Failed to validate the Docker Compose service.",
                500,
                servicesError.message,
            );
        }

        if (!services.includes(service)) {
            throw new ApiError(
                "DOCKER_SERVICE_NOT_FOUND",
                "The selected Docker Compose service was not found.",
                404,
            );
        }
    }

    return {
        action,
        command: buildTerminalCommand(composeCli, composeFile.relativePath, {
            action,
            service,
        }),
        serviceName: service,
    };
}

async function getWorktreePath(project: ProjectConfig, branch: string) {
    const worktreePath = worktreePathFor(project.path, branch);

    if (!(await exists(worktreePath))) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "No worktree exists for this branch yet.",
            404,
        );
    }

    return worktreePath;
}

async function requireComposeFile(worktreePath: string) {
    const composeFile = await findComposeFile(worktreePath);

    if (!composeFile) {
        throw new ApiError(
            "DOCKER_COMPOSE_FILE_NOT_FOUND",
            "No Docker Compose file was found in this worktree.",
            404,
        );
    }

    return composeFile;
}

async function findComposeFile(
    worktreePath: string,
): Promise<ComposeFile | null> {
    const absolutePath = await findComposeFilePath(
        worktreePath,
        COMPOSE_SEARCH_MAX_DEPTH,
    );

    if (!absolutePath) {
        return null;
    }

    return {
        absolutePath,
        relativePath: toPosixPath(path.relative(worktreePath, absolutePath)),
    };
}

async function findComposeFilePath(
    directoryPath: string,
    depthRemaining: number,
): Promise<string | null> {
    for (const fileName of COMPOSE_FILE_NAMES) {
        const candidatePath = path.join(directoryPath, fileName);

        if (await exists(candidatePath)) {
            return candidatePath;
        }
    }

    if (depthRemaining === 0) {
        return null;
    }

    const [readError, entries] = await tryPromise(
        readdir(directoryPath, { withFileTypes: true }),
    );

    if (readError) {
        logger.warn(
            { directoryPath, error: readError.message },
            "failed to scan directory for compose files",
        );
        return null;
    }

    for (const entry of [...entries].sort((left, right) =>
        left.name.localeCompare(right.name),
    )) {
        if (!entry.isDirectory() || SKIPPED_DIRECTORIES.has(entry.name)) {
            continue;
        }

        const result = await findComposeFilePath(
            path.join(directoryPath, entry.name),
            depthRemaining - 1,
        );

        if (result) {
            return result;
        }
    }

    return null;
}

async function resolveComposeCli(worktreePath: string): Promise<ComposeCli> {
    for (const composeCli of [
        { label: "docker compose", prefix: ["docker", "compose"] },
        { label: "docker-compose", prefix: ["docker-compose"] },
    ] satisfies ComposeCli[]) {
        const [error] = await tryPromise(
            runCommandText([...composeCli.prefix, "version"], worktreePath),
        );

        if (!error) {
            return composeCli;
        }
    }

    throw new ApiError(
        "DOCKER_UNAVAILABLE",
        "Docker Compose is unavailable on this machine.",
        500,
    );
}

async function listComposeServices(
    composeCli: ComposeCli,
    worktreePath: string,
    composeFilePath: string,
) {
    const output = await runCommandText(
        [...composeCli.prefix, "-f", composeFilePath, "config", "--services"],
        worktreePath,
    );

    return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

async function listComposeStatus(
    composeCli: ComposeCli,
    worktreePath: string,
    composeFilePath: string,
) {
    const output = await runCommandText(
        [
            ...composeCli.prefix,
            "-f",
            composeFilePath,
            "ps",
            "--all",
            "--format",
            "json",
        ],
        worktreePath,
    );

    return await parseComposePsOutput(output);
}

async function runCommandText(command: string[], cwd: string) {
    const [spawnError, childProcess] = await tryPromise(
        (async () =>
            Bun.spawn(command, {
                cwd,
                env: processEnv(),
                stderr: "pipe",
                stdout: "pipe",
            }))(),
    );

    if (spawnError) {
        throw spawnError;
    }

    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(childProcess.stdout).text(),
        new Response(childProcess.stderr).text(),
        childProcess.exited,
    ]);

    if (exitCode !== 0) {
        throw new Error(
            stderr.trim() || stdout.trim() || `${command.join(" ")} failed.`,
        );
    }

    return stdout.trim();
}

function processEnv() {
    return Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
        ),
    );
}

export async function parseComposePsOutput(
    output: string,
): Promise<ComposePsEntry[]> {
    const trimmed = output.trim();

    if (!trimmed) {
        return [];
    }

    const parsedItems = await parseComposePsJson(trimmed);

    const entries: ComposePsEntry[] = [];

    for (const item of parsedItems) {
        const service = readString(item, "Service", "service");

        if (!service) {
            continue;
        }

        entries.push({
            containerName: readString(item, "Name", "name"),
            health: readString(item, "Health", "health"),
            service,
            state: normalizeDockerServiceState(
                readString(item, "State", "state"),
            ),
            statusText: readString(item, "Status", "status"),
        });
    }

    return entries;
}

async function parseComposePsJson(
    text: string,
): Promise<Record<string, unknown>[]> {
    const [arrayError, arrayPayload] = await parseJson(text);

    if (!arrayError) {
        if (Array.isArray(arrayPayload)) {
            return arrayPayload.filter(isRecord);
        }

        if (isRecord(arrayPayload)) {
            return [arrayPayload];
        }
    }

    const records: Record<string, unknown>[] = [];

    for (const line of text
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)) {
        const [lineError, payload] = await parseJson(line);

        if (lineError || !isRecord(payload)) {
            continue;
        }

        records.push(payload);
    }

    return records;
}

function parseJson(value: string) {
    return tryPromise(
        Promise.resolve().then(() => JSON.parse(value) as unknown),
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return undefined;
}

export function normalizeDockerServiceState(
    state: string | undefined,
): DockerServiceState {
    const normalized = state?.trim().toLowerCase();

    switch (normalized) {
        case "created":
        case "dead":
        case "exited":
        case "paused":
        case "restarting":
        case "running":
            return normalized;
        default:
            return normalized ? "unknown" : "not-created";
    }
}

function buildServiceSummaries(
    services: string[],
    statusEntries: ComposePsEntry[],
): DockerServiceSummary[] {
    const entriesByService = new Map<string, ComposePsEntry[]>();

    for (const entry of statusEntries) {
        const currentEntries = entriesByService.get(entry.service) ?? [];
        currentEntries.push(entry);
        entriesByService.set(entry.service, currentEntries);
    }

    return [...services]
        .sort((left, right) => left.localeCompare(right))
        .map((service) => {
            const entries = entriesByService.get(service) ?? [];

            if (entries.length === 0) {
                return {
                    isRunning: false,
                    name: service,
                    state: "not-created",
                    statusText: "Not created",
                } satisfies DockerServiceSummary;
            }

            const state = summarizeServiceState(entries);
            const runningCount = entries.filter(
                (entry) => entry.state === "running",
            ).length;

            return {
                containerName:
                    entries.length === 1
                        ? entries[0]?.containerName
                        : undefined,
                health: summarizeHealth(entries),
                isRunning: state === "running",
                name: service,
                state,
                statusText:
                    entries.length === 1
                        ? entries[0]?.statusText
                        : `${runningCount}/${entries.length} containers running`,
            } satisfies DockerServiceSummary;
        });
}

function summarizeServiceState(entries: ComposePsEntry[]): DockerServiceState {
    const states = entries.map((entry) => entry.state);

    for (const preferredState of [
        "running",
        "restarting",
        "paused",
        "created",
        "exited",
        "dead",
        "unknown",
    ] satisfies DockerServiceState[]) {
        if (states.includes(preferredState)) {
            return preferredState;
        }
    }

    return "not-created";
}

function summarizeHealth(entries: ComposePsEntry[]) {
    const healthValues = entries
        .map((entry) => entry.health?.trim())
        .filter((value): value is string => Boolean(value));

    if (healthValues.length === 0) {
        return undefined;
    }

    return [...new Set(healthValues)].join(", ");
}

function buildTerminalCommand(
    composeCli: ComposeCli,
    composeFilePath: string,
    params: {
        action: DockerTerminalCommandAction;
        service?: string;
    },
) {
    const actionArguments =
        params.action === "up"
            ? ["up", "-d"]
            : params.action === "down"
              ? ["down"]
              : params.action === "restart"
                ? ["restart"]
                : ["logs", "--follow", "--tail", "200"];
    const command = [
        ...composeCli.prefix,
        "-f",
        composeFilePath,
        ...actionArguments,
    ];

    if (params.action === "logs" && params.service) {
        command.push(params.service);
    }

    return shellJoin(command);
}

function shellJoin(parts: string[]) {
    return parts.map((part) => quoteArgumentIfNeeded(part)).join(" ");
}

function quoteArgumentIfNeeded(value: string) {
    if (!/[\s"'`$&|;<>(){}[\]*?!]/.test(value)) {
        return value;
    }

    if (process.platform === "win32") {
        return `"${value.replaceAll('"', '\\"')}"`;
    }

    return `'${value.replaceAll("'", `'\\''`)}'`;
}

function toPosixPath(value: string) {
    return value.split(path.sep).join("/");
}

export const dockerHandler = {
    getDockerOverview,
    prepareTerminalCommand,
};
