import * as Effect from "effect/Effect";

import { ProjectRepository } from "@/backend/handlers/project-config/repository";
import { runBackendEffect } from "@/backend/runtime";

export const projectConfigHandler = {
    addProject(projectPath: string) {
        return runBackendEffect(
            Effect.flatMap(ProjectRepository, (repository) =>
                repository.addProject(projectPath),
            ),
        );
    },
    findProject(projectId: string) {
        return runBackendEffect(
            Effect.flatMap(ProjectRepository, (repository) =>
                repository.findProject(projectId),
            ),
        );
    },
    readConfig() {
        return runBackendEffect(
            Effect.flatMap(ProjectRepository, (repository) =>
                repository.readConfig(),
            ),
        );
    },
};
