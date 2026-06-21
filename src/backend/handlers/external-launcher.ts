import { spawn } from "node:child_process";

import { tryPromise } from "@/backend/handlers/error";
import {
    ApiError,
    type ScriptOpenResult,
    type TextFileLocation,
} from "@/backend/types";

type EditorLaunchStyle =
    | "direct-path"
    | "file-manager"
    | "goto"
    | "line-column";

type EditorDefinition = {
    id: string;
    commands: readonly string[];
    baseArgs?: readonly string[];
    launchStyle: EditorLaunchStyle;
};

const EDITORS: readonly EditorDefinition[] = [
    { id: "cursor", commands: ["cursor"], launchStyle: "goto" },
    { id: "trae", commands: ["trae"], launchStyle: "goto" },
    {
        id: "kiro",
        commands: ["kiro"],
        baseArgs: ["ide"],
        launchStyle: "goto",
    },
    { id: "vscode", commands: ["code"], launchStyle: "goto" },
    {
        id: "vscode-insiders",
        commands: ["code-insiders"],
        launchStyle: "goto",
    },
    { id: "vscodium", commands: ["codium"], launchStyle: "goto" },
    {
        id: "zed",
        commands: ["zed", "zeditor"],
        launchStyle: "direct-path",
    },
    { id: "antigravity", commands: ["agy"], launchStyle: "goto" },
    { id: "idea", commands: ["idea"], launchStyle: "line-column" },
    { id: "aqua", commands: ["aqua"], launchStyle: "line-column" },
    { id: "clion", commands: ["clion"], launchStyle: "line-column" },
    {
        id: "datagrip",
        commands: ["datagrip"],
        launchStyle: "line-column",
    },
    {
        id: "dataspell",
        commands: ["dataspell"],
        launchStyle: "line-column",
    },
    { id: "goland", commands: ["goland"], launchStyle: "line-column" },
    {
        id: "phpstorm",
        commands: ["phpstorm"],
        launchStyle: "line-column",
    },
    {
        id: "pycharm",
        commands: ["pycharm"],
        launchStyle: "line-column",
    },
    { id: "rider", commands: ["rider"], launchStyle: "line-column" },
    {
        id: "rubymine",
        commands: ["rubymine"],
        launchStyle: "line-column",
    },
    {
        id: "rustrover",
        commands: ["rustrover"],
        launchStyle: "line-column",
    },
    {
        id: "webstorm",
        commands: ["webstorm"],
        launchStyle: "line-column",
    },
    {
        id: "file-manager",
        commands: [],
        launchStyle: "file-manager",
    },
];

type EditorLaunch = {
    args: string[];
    command: string;
    editor: string;
};

type ResolveEditorLaunchOptions = {
    commandResolver?: (command: string) => string | undefined;
    configuredEditor?: string;
    platform?: NodeJS.Platform;
};

async function openFile(filePath: string): Promise<ScriptOpenResult> {
    return await openTextFile({ filePath });
}

async function openTextFile(
    location: string | TextFileLocation,
): Promise<ScriptOpenResult> {
    const launch = resolveEditorLaunch(location);
    const [error] = await tryPromise(launchDetached(launch));

    if (error) {
        throw new ApiError(
            "EDITOR_LAUNCH_FAILED",
            `Failed to open the file in ${launch.editor}.`,
            500,
            error.message,
        );
    }

    return { editor: launch.editor };
}

function resolveEditorLaunch(
    location: string | TextFileLocation,
    options: ResolveEditorLaunchOptions = {},
): EditorLaunch {
    const normalizedLocation = normalizeTextFileLocation(location);
    const configuredEditor = (
        options.configuredEditor ?? process.env.PR_RUN_EDITOR
    )
        ?.trim()
        .toLowerCase();
    const commandResolver =
        options.commandResolver ??
        ((command: string) => Bun.which(command) ?? undefined);
    const platform = options.platform ?? process.platform;
    const editor = configuredEditor
        ? EDITORS.find(
              (item) =>
                  item.id === configuredEditor ||
                  item.commands.includes(configuredEditor),
          )
        : (EDITORS.find(
              (item) =>
                  item.launchStyle !== "file-manager" &&
                  resolveCommand(item.commands, commandResolver),
          ) ?? EDITORS.find((item) => item.id === "file-manager"));

    if (!editor) {
        throw new ApiError(
            "EDITOR_NOT_FOUND",
            configuredEditor
                ? `Configured editor not found: ${configuredEditor}.`
                : "No supported code editor was found.",
            404,
        );
    }

    const command = resolveEditorCommand(editor, platform, commandResolver);

    if (!command) {
        throw new ApiError(
            "EDITOR_NOT_FOUND",
            `Editor command not found for ${editor.id}.`,
            404,
        );
    }

    return {
        editor: editor.id,
        command,
        args: [
            ...(editor.baseArgs ?? []),
            ...editorArgs(editor, normalizedLocation),
        ],
    };
}

function editorArgs(editor: EditorDefinition, location: TextFileLocation) {
    switch (editor.launchStyle) {
        case "direct-path":
            return [formatPathLocation(location)];
        case "file-manager":
            return [location.filePath];
        case "goto":
            return ["--goto", formatPathLocation(location)];
        case "line-column":
            if (!isPositiveInteger(location.line)) {
                return [location.filePath];
            }

            return [
                "--line",
                String(location.line),
                ...(isPositiveInteger(location.column)
                    ? ["--column", String(location.column)]
                    : []),
                location.filePath,
            ];
    }
}

function formatPathLocation(location: TextFileLocation) {
    if (!isPositiveInteger(location.line)) {
        return location.filePath;
    }

    if (!isPositiveInteger(location.column)) {
        return `${location.filePath}:${location.line}`;
    }

    return `${location.filePath}:${location.line}:${location.column}`;
}

function normalizeTextFileLocation(
    location: string | TextFileLocation,
): TextFileLocation {
    const normalizedLocation =
        typeof location === "string" ? { filePath: location } : location;
    const filePath = normalizedLocation.filePath?.trim();

    if (!filePath) {
        throw new ApiError("BAD_REQUEST", "Enter a file path.", 400);
    }

    return {
        filePath,
        line: normalizedLocation.line,
        column: normalizedLocation.column,
    };
}

function resolveCommand(
    commands: readonly string[],
    commandResolver: (command: string) => string | undefined,
) {
    return commands.find((command) => commandResolver(command));
}

function resolveEditorCommand(
    editor: EditorDefinition,
    platform: NodeJS.Platform,
    commandResolver: (command: string) => string | undefined,
) {
    if (editor.launchStyle === "file-manager") {
        return platformOpenCommand(platform);
    }

    return resolveCommand(editor.commands, commandResolver);
}

function platformOpenCommand(platform: NodeJS.Platform) {
    if (platform === "darwin") {
        return "open";
    }

    if (platform === "win32") {
        return "explorer";
    }

    return "xdg-open";
}

function isPositiveInteger(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) > 0;
}

function launchDetached(launch: EditorLaunch) {
    return new Promise<void>((resolve, reject) => {
        const childProcess = spawn(launch.command, launch.args, {
            detached: true,
            shell: process.platform === "win32",
            stdio: "ignore",
        });

        childProcess.once("error", reject);
        childProcess.once("spawn", () => {
            childProcess.unref();
            resolve();
        });
    });
}

export const externalLauncherHandler = {
    formatPathLocation,
    normalizeTextFileLocation,
    openFile,
    openTextFile,
    resolveEditorLaunch,
};
