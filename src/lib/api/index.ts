import type { OverviewSnapshot } from "@/types/overview";
import { environmentApi } from "./environment";
import { gitApi } from "./git";
import { projectApi } from "./projects";
import { reviewApi } from "./reviews";
import { scriptApi } from "./scripts";
import { terminalApi } from "./terminal";
import {
    clearSshPassphrase,
    getBackendUrl,
    isHandledSshPromptError,
    requestOne,
    resolveGitHubMediaUrl,
    saveSshPassphrase,
} from "./transport";

export {
    getBackendUrl,
    isHandledSshPromptError,
    resolveGitHubMediaUrl,
    saveSshPassphrase,
};

export const prRunApi = {
    ...environmentApi,
    ...gitApi,
    ...projectApi,
    ...reviewApi,
    ...scriptApi,
    ...terminalApi,
    clearSshPassphrase,
    getOverview(projectId?: string) {
        const query = projectId
            ? `?${new URLSearchParams({ projectId }).toString()}`
            : "";
        return requestOne<OverviewSnapshot>(`/overview${query}`);
    },
    saveSshPassphrase,
};
