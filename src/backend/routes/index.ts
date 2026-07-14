import type { Elysia } from "elysia";

import dockerRoutes from "@/backend/routes/docker";
import envFilesRoutes from "@/backend/routes/env-files";
import gitHubMediaRoutes from "@/backend/routes/github-media";
import healthRoutes from "@/backend/routes/health";
import projectRoutes from "@/backend/routes/projects";
import pullRequestRoutes from "@/backend/routes/pull-requests";
import scriptRoutes from "@/backend/routes/scripts";
import sshPassphraseRoutes from "@/backend/routes/ssh-passphrase";
import terminalRoutes from "@/backend/routes/terminal";

export function registerRoutes(app: Elysia) {
    return app
        .use(healthRoutes)
        .use(terminalRoutes)
        .use(projectRoutes)
        .use(gitHubMediaRoutes)
        .use(scriptRoutes)
        .use(sshPassphraseRoutes)
        .use(pullRequestRoutes)
        .use(dockerRoutes)
        .use(envFilesRoutes);
}
