import { Elysia } from "elysia";

import { gitHandler } from "@/backend/handlers/git";

const router = new Elysia();

router.get("/github/media", async ({ query }) => {
    const sourceUrl = String(query.url ?? "");

    return await gitHandler.getGitHubMedia(sourceUrl);
});

export default router;
