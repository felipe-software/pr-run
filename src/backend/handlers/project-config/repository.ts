import {
    mkdir,
    readFile,
    realpath,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import path from "node:path";

import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import {
    ApiError,
    type ProjectConfig,
    type ProjectsConfig,
} from "@/backend/types";
import { ProjectsConfigSchema } from "@/contracts/project";

const DEFAULT_GROUP_ID = "default";

type ProjectRepositoryService = {
    addProject(projectPath: string): Effect.Effect<ProjectConfig, ApiError>;
    findProject(projectId: string): Effect.Effect<ProjectConfig, ApiError>;
    readConfig(): Effect.Effect<ProjectsConfig, ApiError>;
};

export class ProjectRepository extends Context.Tag(
    "pr-run/backend/ProjectRepository",
)<ProjectRepository, ProjectRepositoryService>() {
    static readonly layer = Layer.effect(
        ProjectRepository,
        Effect.gen(function* () {
            const writeSemaphore = yield* Effect.makeSemaphore(1);

            const readConfig = Effect.fn("ProjectRepository.readConfig")(
                function* () {
                    const configPath = getConfigPath();
                    const raw = yield* Effect.tryPromise({
                        catch: (error) => toReadError(error),
                        try: () => readFile(configPath, "utf8"),
                    }).pipe(
                        Effect.catchAll((error) =>
                            error.details === "ENOENT"
                                ? Effect.succeed(
                                      JSON.stringify(defaultConfig()),
                                  )
                                : Effect.fail(error),
                        ),
                    );

                    return yield* parseConfig(raw);
                },
            );

            const writeConfig = Effect.fn("ProjectRepository.writeConfig")(
                function* (config: ProjectsConfig) {
                    const configPath = getConfigPath();
                    const temporaryPath = `${configPath}.${crypto.randomUUID()}.tmp`;

                    yield* Effect.tryPromise({
                        catch: toWriteError,
                        try: async () => {
                            await mkdir(path.dirname(configPath), {
                                recursive: true,
                            });
                            await writeFile(
                                temporaryPath,
                                `${JSON.stringify(config, null, 2)}\n`,
                                "utf8",
                            );

                            try {
                                await rename(temporaryPath, configPath);
                            } finally {
                                await rm(temporaryPath, { force: true });
                            }
                        },
                    });
                },
            );

            const addProject = Effect.fn("ProjectRepository.addProject")(
                function* (projectPath: string) {
                    return yield* writeSemaphore.withPermits(1)(
                        Effect.gen(function* () {
                            const config = yield* readConfig();
                            const resolvedPath = yield* Effect.tryPromise({
                                catch: (error) =>
                                    new ApiError(
                                        "PROJECT_NOT_FOUND",
                                        "Project path was not found.",
                                        404,
                                        error instanceof Error
                                            ? error.message
                                            : String(error),
                                    ),
                                try: () => realpath(projectPath),
                            });
                            const existing = config.groups
                                .flatMap((item) => item.projects)
                                .find(
                                    (project) => project.path === resolvedPath,
                                );

                            if (existing) {
                                return existing;
                            }

                            let defaultGroup = config.groups.find(
                                (item) => item.id === DEFAULT_GROUP_ID,
                            );

                            if (!defaultGroup) {
                                defaultGroup = {
                                    collapsed: false,
                                    id: DEFAULT_GROUP_ID,
                                    name: "Projects",
                                    projects: [],
                                };
                                config.groups.unshift(defaultGroup);
                            }

                            const project: ProjectConfig = {
                                id: crypto.randomUUID(),
                                name: path.basename(resolvedPath),
                                path: resolvedPath,
                            };

                            defaultGroup.projects.push(project);
                            yield* writeConfig(config);

                            return project;
                        }),
                    );
                },
            );

            const findProject = Effect.fn("ProjectRepository.findProject")(
                function* (projectId: string) {
                    const config = yield* readConfig();
                    const project = config.groups
                        .flatMap((group) => group.projects)
                        .find((item) => item.id === projectId);

                    if (!project) {
                        return yield* Effect.fail(
                            new ApiError(
                                "PROJECT_NOT_FOUND",
                                "Project not found.",
                                404,
                            ),
                        );
                    }

                    return project;
                },
            );

            return ProjectRepository.of({
                addProject,
                findProject,
                readConfig,
            });
        }),
    );
}

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
                collapsed: false,
                id: DEFAULT_GROUP_ID,
                name: "Projects",
                projects: [],
            },
        ],
    };
}

function parseConfig(raw: string) {
    return Schema.decodeUnknown(Schema.parseJson(ProjectsConfigSchema))(
        raw,
    ).pipe(
        Effect.mapError(
            (error) =>
                new ApiError(
                    "CONFIG_READ_FAILED",
                    "Failed to read local configuration.",
                    500,
                    String(error),
                ),
        ),
    );
}

function toReadError(error: unknown) {
    const code = (error as NodeJS.ErrnoException).code;

    return new ApiError(
        "CONFIG_READ_FAILED",
        "Failed to read local configuration.",
        500,
        code === "ENOENT"
            ? code
            : error instanceof Error
              ? error.message
              : String(error),
    );
}

function toWriteError(error: unknown) {
    return new ApiError(
        "CONFIG_WRITE_FAILED",
        "Failed to save local configuration.",
        500,
        error instanceof Error ? error.message : String(error),
    );
}
