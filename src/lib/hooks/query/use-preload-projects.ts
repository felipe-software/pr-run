import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { tryPromise } from "@/lib/error";
import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";
import { projectBranchesQueryOptions } from "@/lib/hooks/query/use-project-branches-query";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

export function usePreloadProjects(
    projects: ProjectConfig[],
    onProjectBranchesLoaded?: (
        projectId: string,
        branches: BranchInfo[],
    ) => void,
) {
    const queryClient = useQueryClient();
    const preloadedProjectIds = useRef(new Set<string>());
    const onProjectBranchesLoadedRef = useRef(onProjectBranchesLoaded);

    useEffect(() => {
        onProjectBranchesLoadedRef.current = onProjectBranchesLoaded;
    }, [onProjectBranchesLoaded]);

    useEffect(() => {
        const pendingProjects = projects.filter(
            (project) => !preloadedProjectIds.current.has(project.id),
        );

        if (pendingProjects.length === 0) {
            return;
        }

        for (const project of pendingProjects) {
            preloadedProjectIds.current.add(project.id);

            tryPromise(preloadProject(project.id, queryClient)).then(
                ([error, branches]) => {
                    if (!error) {
                        onProjectBranchesLoadedRef.current?.(
                            project.id,
                            branches,
                        );
                        return;
                    }

                    preloadedProjectIds.current.delete(project.id);
                    console.error(
                        `Failed to preload project "${project.name}".`,
                        error,
                    );
                },
            );
        }
    }, [projects, queryClient]);
}

async function preloadProject(
    projectId: string,
    queryClient: ReturnType<typeof useQueryClient>,
) {
    await prRunApi.updateProjectWorktrees(projectId);
    await queryClient.invalidateQueries({
        queryKey: prRunQueryKeys.project(projectId),
    });
    return await queryClient.fetchQuery(projectBranchesQueryOptions(projectId));
}
