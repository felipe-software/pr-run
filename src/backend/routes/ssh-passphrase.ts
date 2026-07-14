import { Elysia } from "elysia";

import { success } from "@/backend/http/response";
import { logger } from "@/backend/logger";
import { clearSshPassphrase, setSshPassphrase } from "@/backend/ssh-passphrase";
import { ApiError } from "@/backend/types";

const router = new Elysia();

router
    .post("/ssh-passphrase", ({ body }) => {
        const payload = body as { passphrase?: string };

        if (!payload.passphrase) {
            throw new ApiError("BAD_REQUEST", "Enter the SSH passphrase.", 400);
        }

        setSshPassphrase(payload.passphrase);
        logger.info("ssh passphrase updated in memory");

        return success("SSH passphrase saved.", [{ ok: true }], {
            action: "ssh_passphrase_saved",
        });
    })
    .post("/ssh-passphrase/clear", () => {
        clearSshPassphrase();
        logger.info("ssh passphrase cleared from memory");

        return success("SSH passphrase cleared.", [{ ok: true }], {
            action: "ssh_passphrase_cleared",
        });
    });

export default router;
