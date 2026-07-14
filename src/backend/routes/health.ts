import { Elysia } from "elysia";

import { success } from "@/backend/http/response";

const router = new Elysia();

router.get("/health", () => success("Backend is healthy.", [{ ok: true }]));

export default router;
