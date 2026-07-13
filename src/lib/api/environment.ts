import type {
    DockerOverviewResult,
    DockerTerminalCommandAction,
    DockerTerminalCommandResult,
    EnvFilesOverviewResult,
    PackageScriptCatalog,
    PackageScriptTerminalCommandResult,
} from "@/types/pr-run";
import { projectPath } from "./projects";
import { requestOne } from "./transport";

export const environmentApi = {
    getDockerOverview(projectId: string, branch: string) {
        return requestOne<DockerOverviewResult>(
            branchPath(projectId, "/docker", branch),
        );
    },
    getEnvFiles(projectId: string, branch: string) {
        return requestOne<EnvFilesOverviewResult>(
            branchPath(projectId, "/env", branch),
        );
    },
    getPackageScripts(projectId: string, branch: string) {
        return requestOne<PackageScriptCatalog>(
            branchPath(projectId, "/package-scripts", branch),
        );
    },
    prepareDockerTerminalCommand(
        projectId: string,
        branch: string,
        action: DockerTerminalCommandAction,
        service?: string,
    ) {
        return requestOne<DockerTerminalCommandResult>(
            projectPath(projectId, "/docker/terminal-command"),
            { json: { action, branch, service }, method: "POST" },
        );
    },
    preparePackageScriptTerminalCommand(
        projectId: string,
        branch: string,
        packagePath: string,
        scriptName: string,
    ) {
        return requestOne<PackageScriptTerminalCommandResult>(
            projectPath(projectId, "/package-scripts/terminal-command"),
            { json: { branch, packagePath, scriptName }, method: "POST" },
        );
    },
};

function branchPath(projectId: string, suffix: string, branch: string) {
    return `${projectPath(projectId, suffix)}?${new URLSearchParams({ branch })}`;
}
