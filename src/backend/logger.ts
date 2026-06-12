import pino from "pino";

export const logger = pino({
    level: process.env.PR_RUN_LOG_LEVEL ?? "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            singleLine: true,
        },
    },
});
