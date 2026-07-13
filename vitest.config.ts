import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [
        {
            name: "test-bun-module-stub",
            resolveId(id) {
                // Production uses Bun's shell API, but these Node-based unit tests only import its modules.
                return id === "bun" ? "\0test-bun-module-stub" : undefined;
            },
            load(id) {
                if (id !== "\0test-bun-module-stub") {
                    return undefined;
                }

                return `
                    export const $ = () => {
                        throw new Error("Bun shell commands are unavailable in Vitest");
                    };
                `;
            },
        },
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    test: {
        environment: "node",
        include: ["{electron,src}/**/*.test.{ts,tsx}"],
        restoreMocks: true,
    },
});
