import {
    mkdir,
    readFile,
    readdir,
    rename,
    unlink,
    writeFile,
} from "node:fs/promises";
import path from "node:path";

import { tryPromise } from "@/backend/handlers/error";
import { externalLauncherHandler } from "@/backend/handlers/external-launcher";
import { exists, worktreePathFor } from "@/backend/handlers/git/helpers";
import { logger } from "@/backend/logger";
import {
    ApiError,
    type ProjectConfig,
    type ScriptInfo,
    type ScriptOpenResult,
    type ScriptRunResult,
    type ScriptSourceResult,
    type ScriptTerminalCommandResult,
} from "@/backend/types";

const SCRIPT_RUNTIME_FILE_NAME = "_runtime.ts";
const SCRIPT_RUN_PAYLOAD_PREFIX = "_run-";
const SCRIPT_RESULT_MARKER = "__PR_RUN_SCRIPT_RESULT__";
const SCRIPT_EVENT_MARKER = "__PR_RUN_SCRIPT_EVENT__";
const SCRIPT_ID_PATTERN =
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const SCRIPT_SOURCE_TEMPLATE = `import { registerScript } from "./${SCRIPT_RUNTIME_FILE_NAME}";

registerScript(
    { title: TITLE, button: true, lifecycles: [] },
    async (ctx, cmd) => {
        // Write arbitrary TypeScript here.
        // Commands can be run with: await cmd.runOnWorktree(\`your command\`)
        void ctx;
        void cmd;
        return true;
    },
);
`;

function getScriptsDirectory() {
    const userDataDir =
        process.env.PR_RUN_USER_DATA_DIR ??
        path.join(process.cwd(), ".pr-run-data");

    return path.join(userDataDir, "scripts");
}

async function createScript(title: string): Promise<ScriptInfo> {
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
        throw new ApiError("BAD_REQUEST", "Enter a script title.", 400);
    }

    const id = crypto.randomUUID();
    const fileName = `${slugify(normalizedTitle)}-${id}.ts`;
    const filePath = path.join(getScriptsDirectory(), fileName);
    const source = SCRIPT_SOURCE_TEMPLATE.replace(
        "TITLE",
        JSON.stringify(normalizedTitle),
    );
    const [error] = await tryPromise(
        (async () => {
            await ensureScriptsDirectory();
            await writeFile(filePath, source, {
                encoding: "utf8",
                flag: "wx",
            });
        })(),
    );

    if (error) {
        throw new ApiError(
            "SCRIPT_CREATE_FAILED",
            "Failed to create the script file.",
            500,
            error.message,
        );
    }

    logger.info({ filePath, scriptId: id }, "script created");
    return await inspectScript(filePath, id);
}

async function listScripts(): Promise<ScriptInfo[]> {
    const scriptsDirectory = getScriptsDirectory();
    const [error, entries] = await tryPromise(
        (async () => {
            await ensureScriptsDirectory();
            return await readdir(scriptsDirectory, { withFileTypes: true });
        })(),
    );

    if (error) {
        throw new ApiError(
            "SCRIPT_LOAD_FAILED",
            "Failed to read the scripts directory.",
            500,
            error.message,
        );
    }

    const scripts: ScriptInfo[] = [];
    const scriptEntries = entries
        .filter(isScriptEntry)
        .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of scriptEntries) {
        const filePath = path.join(scriptsDirectory, entry.name);
        const scriptId = scriptIdFromFileName(entry.name);
        const [loadError, script] = await tryPromise(
            inspectScript(filePath, scriptId),
        );

        scripts.push(
            loadError
                ? fallbackScriptInfo(filePath, loadError.message)
                : script,
        );
    }

    return scripts;
}

async function getScriptSource(scriptId: string): Promise<ScriptSourceResult> {
    const filePath = await findScriptFile(scriptId);
    const [error, source] = await tryPromise(readFile(filePath, "utf8"));

    if (error) {
        throw new ApiError(
            "SCRIPT_LOAD_FAILED",
            "Failed to read the script source.",
            500,
            error.message,
        );
    }

    return { scriptId, filePath, source };
}

async function updateScriptSource(
    scriptId: string,
    source: string,
): Promise<ScriptInfo> {
    const filePath = await findScriptFile(scriptId);
    const validationPath = path.join(
        path.dirname(filePath),
        `_validate-${crypto.randomUUID()}.ts`,
    );
    const [error, script] = await tryPromise(
        (async () => {
            await writeFile(validationPath, source, "utf8");
            const registeredScript = await inspectScript(
                validationPath,
                scriptId,
            );
            await rename(validationPath, filePath);
            return registeredScript;
        })(),
    );

    if (error) {
        await tryPromise(unlink(validationPath));
        throw new ApiError(
            "SCRIPT_LOAD_FAILED",
            "The script could not be saved because it is invalid.",
            400,
            error.message,
        );
    }

    logger.info({ filePath, scriptId }, "script updated");
    return {
        ...script,
        id: scriptId,
        fileName: path.basename(filePath),
        filePath,
    };
}

async function deleteScript(scriptId: string): Promise<ScriptInfo> {
    const filePath = await findScriptFile(scriptId);
    const [loadError, loadedScript] = await tryPromise(
        inspectScript(filePath, scriptId),
    );
    const script = loadError
        ? fallbackScriptInfo(filePath, loadError.message)
        : loadedScript;
    const [error] = await tryPromise(unlink(filePath));

    if (error) {
        throw new ApiError(
            "SCRIPT_DELETE_FAILED",
            "Failed to delete the script.",
            500,
            error.message,
        );
    }

    logger.info({ filePath, scriptId }, "script deleted");
    return script;
}

async function openScript(scriptId: string): Promise<ScriptOpenResult> {
    const filePath = await findScriptFile(scriptId);
    return await externalLauncherHandler.openFile(filePath);
}

async function prepareTerminalCommand(
    project: ProjectConfig,
    branch: string,
    scriptId: string,
): Promise<ScriptTerminalCommandResult> {
    const worktreePath = worktreePathFor(project.path, branch);

    if (!(await exists(worktreePath))) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "No worktree exists for this branch yet.",
            404,
        );
    }

    await ensureScriptsDirectory();
    const filePath = await findScriptFile(scriptId);
    const runnerPath = path.join(import.meta.dir, "runner.ts");
    const payloadPath = path.join(
        getScriptsDirectory(),
        `${SCRIPT_RUN_PAYLOAD_PREFIX}${crypto.randomUUID()}.json`,
    );
    await writeFile(
        payloadPath,
        JSON.stringify({
            action: "run",
            filePath,
            scriptId,
            context: {
                id: scriptId,
                projectId: project.id,
                projectPath: project.path,
                branch,
                worktreePath,
            },
        }),
        "utf8",
    );

    return {
        command:
            process.platform === "win32"
                ? `set PR_RUN_SCRIPT_TERMINAL=1&& bun "${runnerPath}" "${payloadPath}"`
                : `PR_RUN_SCRIPT_TERMINAL=1 bun ${shellQuote(runnerPath)} ${shellQuote(payloadPath)}`,
    };
}

async function runScript(
    project: ProjectConfig,
    branch: string,
    scriptId: string,
): Promise<ScriptRunResult> {
    const worktreePath = worktreePathFor(project.path, branch);

    if (!(await exists(worktreePath))) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "No worktree exists for this branch yet.",
            404,
        );
    }

    const filePath = await findScriptFile(scriptId);
    const [executionError, result] = await tryPromise(
        runScriptProcess({
            action: "run",
            filePath,
            scriptId,
            context: {
                id: scriptId,
                projectId: project.id,
                projectPath: project.path,
                branch,
                worktreePath,
            },
        }),
    );

    if (executionError) {
        throw new ApiError(
            "SCRIPT_EXECUTION_FAILED",
            "Failed to run the script.",
            500,
            executionError.message,
        );
    }

    const scriptResult = result as ScriptRunResult;

    logger.info(
        { branch, projectId: project.id, ...scriptResult },
        "script execution finished",
    );

    return scriptResult;
}

async function streamScript(
    project: ProjectConfig,
    branch: string,
    scriptId: string,
) {
    const worktreePath = worktreePathFor(project.path, branch);

    if (!(await exists(worktreePath))) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "No worktree exists for this branch yet.",
            404,
        );
    }

    const filePath = await findScriptFile(scriptId);
    const childProcess = createRunnerProcess({
        action: "run",
        filePath,
        scriptId,
        context: {
            id: scriptId,
            projectId: project.id,
            projectPath: project.path,
            branch,
            worktreePath,
        },
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            void forwardRunnerStream(childProcess, controller, encoder);
        },
        cancel() {
            childProcess.kill();
        },
    });

    return new Response(stream, {
        headers: {
            "cache-control": "no-cache",
            "content-type": "application/x-ndjson; charset=utf-8",
            "x-content-type-options": "nosniff",
        },
    });
}

async function findScriptFile(scriptId: string) {
    const scriptsDirectory = getScriptsDirectory();
    const [error, entries] = await tryPromise(
        (async () => {
            await ensureScriptsDirectory();
            return await readdir(scriptsDirectory, { withFileTypes: true });
        })(),
    );

    if (error) {
        throw new ApiError(
            "SCRIPT_LOAD_FAILED",
            "Failed to read the scripts directory.",
            500,
            error.message,
        );
    }

    const entry = entries.find(
        (item) =>
            isScriptEntry(item) && scriptIdFromFileName(item.name) === scriptId,
    );

    if (!entry) {
        throw new ApiError("SCRIPT_NOT_FOUND", "Script not found.", 404);
    }

    return path.join(scriptsDirectory, entry.name);
}

function processEnv() {
    return Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
        ),
    );
}

async function inspectScript(filePath: string, scriptId: string) {
    return (await runScriptProcess({
        action: "inspect",
        filePath,
        scriptId,
    })) as ScriptInfo;
}

async function runScriptProcess(payload: Record<string, unknown>) {
    const childProcess = createRunnerProcess(payload);
    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(childProcess.stdout).text(),
        new Response(childProcess.stderr).text(),
        childProcess.exited,
    ]);
    const markerIndex = stdout.lastIndexOf(SCRIPT_RESULT_MARKER);

    if (exitCode !== 0 || markerIndex === -1) {
        throw new Error(
            stderr.trim() || stdout.trim() || "Script runner failed.",
        );
    }

    const resultLine = stdout
        .slice(markerIndex + SCRIPT_RESULT_MARKER.length)
        .split("\n", 1)[0];
    return JSON.parse(resultLine) as unknown;
}

function createRunnerProcess(payload: Record<string, unknown>) {
    const runnerPath = path.join(import.meta.dir, "runner.ts");

    return Bun.spawn(["bun", runnerPath], {
        cwd: process.cwd(),
        env: {
            ...processEnv(),
            PR_RUN_SCRIPT_PAYLOAD: JSON.stringify(payload),
        },
        stderr: "pipe",
        stdout: "pipe",
    });
}

async function forwardRunnerStream(
    childProcess: ReturnType<typeof createRunnerProcess>,
    controller: ReadableStreamDefaultController<Uint8Array>,
    encoder: TextEncoder,
) {
    const stderrChunks: string[] = [];
    const [streamError] = await tryPromise(
        Promise.all([
            pipeReadableStream(childProcess.stdout, (chunk) => {
                controller.enqueue(chunk);
            }),
            pipeReadableStream(childProcess.stderr, (chunk) => {
                stderrChunks.push(new TextDecoder().decode(chunk));
                controller.enqueue(
                    encoder.encode(
                        `${SCRIPT_EVENT_MARKER}${JSON.stringify({ type: "output", data: `\u001b[31m${new TextDecoder().decode(chunk)}\u001b[0m` })}\n`,
                    ),
                );
            }),
        ]),
    );
    const exitCode = await childProcess.exited;

    if (streamError || exitCode !== 0) {
        const message =
            stderrChunks.join("").trim() ||
            streamError?.message ||
            "Script runner failed.";
        controller.enqueue(
            encoder.encode(
                `${SCRIPT_EVENT_MARKER}${JSON.stringify({ type: "error", message })}\n`,
            ),
        );
    }

    controller.close();
}

async function pipeReadableStream(
    stream: ReadableStream<Uint8Array>,
    onChunk: (chunk: Uint8Array) => void,
) {
    const reader = stream.getReader();

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            return;
        }

        onChunk(value);
    }
}

async function ensureScriptsDirectory() {
    const scriptsDirectory = getScriptsDirectory();
    const runtimeUrl = new URL("./runtime.ts", import.meta.url).href;
    const runtimeSource = `export { registerScript, tryPromise } from ${JSON.stringify(runtimeUrl)};\n`;

    await mkdir(scriptsDirectory, { recursive: true });
    const entries = await readdir(scriptsDirectory, { withFileTypes: true });
    await Promise.allSettled(
        entries
            .filter(
                (entry) =>
                    entry.isFile() &&
                    (entry.name.startsWith("_loaded-") ||
                        entry.name.startsWith("_validate-")),
            )
            .map((entry) => unlink(path.join(scriptsDirectory, entry.name))),
    );
    await writeFile(
        path.join(scriptsDirectory, SCRIPT_RUNTIME_FILE_NAME),
        runtimeSource,
        "utf8",
    );
}

function isScriptEntry(entry: { isFile(): boolean; name: string }) {
    return (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.startsWith("_")
    );
}

function scriptIdFromFileName(fileName: string) {
    const baseName = path.basename(fileName, path.extname(fileName));
    return baseName.match(SCRIPT_ID_PATTERN)?.[1] ?? baseName;
}

function scriptTitleFromFileName(fileName: string) {
    const baseName = path.basename(fileName, path.extname(fileName));
    return baseName
        .replace(SCRIPT_ID_PATTERN, "")
        .replace(/-+$/, "")
        .split("-")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" ");
}

function slugify(title: string) {
    const slug = title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug || "script";
}

function shellQuote(value: string) {
    return `'${value.replaceAll("'", `'\\''`)}'`;
}

function fallbackScriptInfo(filePath: string, loadError: string): ScriptInfo {
    const fileName = path.basename(filePath);

    return {
        id: scriptIdFromFileName(fileName),
        title: scriptTitleFromFileName(fileName) || "Invalid script",
        fileName,
        filePath,
        button: false,
        lifecycles: [],
        loadError,
    };
}

export const scriptsHandler = {
    createScript,
    deleteScript,
    getScriptSource,
    listScripts,
    openScript,
    prepareTerminalCommand,
    runScript,
    streamScript,
    updateScriptSource,
};
