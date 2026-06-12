import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiError, type ProjectConfig, type ProjectsConfig } from "./types";

const DEFAULT_GROUP_ID = "default";

function getConfigPath() {
    const userDataDir =
        process.env.PR_RUN_USER_DATA_DIR ??
        path.join(process.cwd(), ".pr-run-data");

    return path.join(userDataDir, "projects.json");
}

function defaultConfig(): ProjectsConfig {
    return {
        groups: [
            {
                id: DEFAULT_GROUP_ID,
                name: "Projects",
                collapsed: false,
                projects: [],
            },
        ],
    };
}

export async function readConfig(): Promise<ProjectsConfig> {
    const configPath = getConfigPath();

    try {
        const raw = await readFile(configPath, "utf8");
        const parsed = JSON.parse(raw) as ProjectsConfig;

        if (!Array.isArray(parsed.groups)) {
            throw new Error("Invalid config shape");
        }

        return parsed;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return defaultConfig();
        }

        throw new ApiError(
            "CONFIG_READ_FAILED",
            "Failed to read local configuration.",
            500,
            error instanceof Error ? error.message : String(error),
        );
    }
}

export async function writeConfig(config: ProjectsConfig) {
    const configPath = getConfigPath();

    try {
        await mkdir(path.dirname(configPath), { recursive: true });
        await writeFile(
            configPath,
            `${JSON.stringify(config, null, 2)}\n`,
            "utf8",
        );
    } catch (error) {
        throw new ApiError(
            "CONFIG_WRITE_FAILED",
            "Failed to save local configuration.",
            500,
            error instanceof Error ? error.message : String(error),
        );
    }
}

export async function addProjectToConfig(
    projectPath: string,
): Promise<ProjectConfig> {
    const config = await readConfig();
    const resolvedPath = await realpath(projectPath);
    const group = config.groups.find((item) => item.id === DEFAULT_GROUP_ID);

    if (!group) {
        config.groups.unshift({
            id: DEFAULT_GROUP_ID,
            name: "Projects",
            collapsed: false,
            projects: [],
        });
    }

    const defaultGroup = config.groups.find(
        (item) => item.id === DEFAULT_GROUP_ID,
    );
    const existing = config.groups
        .flatMap((item) => item.projects)
        .find((project) => project.path === resolvedPath);

    if (existing) {
        return existing;
    }

    const project: ProjectConfig = {
        id: crypto.randomUUID(),
        name: path.basename(resolvedPath),
        path: resolvedPath,
    };

    defaultGroup?.projects.push(project);
    await writeConfig(config);

    return project;
}

export async function findProject(projectId: string): Promise<ProjectConfig> {
    const config = await readConfig();
    const project = config.groups
        .flatMap((group) => group.projects)
        .find((item) => item.id === projectId);

    if (!project) {
        throw new ApiError("PROJECT_NOT_FOUND", "Project not found.", 404);
    }

    return project;
}
