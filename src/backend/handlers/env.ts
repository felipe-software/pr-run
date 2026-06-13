import { z } from "zod";

const envSchema = z.object({
    PR_RUN_USER_DATA_DIR: z.string().optional(),
});

export const env = envSchema.parse(process.env);
