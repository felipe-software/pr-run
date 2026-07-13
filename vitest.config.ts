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
                    import { spawn } from "node:child_process";

                    function quote(value) {
                        return "'" + String(value).replaceAll("'", "'\\\\''") + "'";
                    }

                    export const $ = (strings, ...values) => {
                        let environment = process.env;
                        const command = strings.reduce(
                            (result, part, index) => {
                                const value = values[index];
                                const interpolation = Array.isArray(value)
                                    ? value.map(quote).join(" ")
                                    : value === undefined
                                      ? ""
                                      : quote(value);
                                return result + part + interpolation;
                            },
                            "",
                        );
                        const run = () =>
                            new Promise((resolve, reject) => {
                                const child = spawn(command, {
                                    env: environment,
                                    shell: true,
                                });
                                const stdout = [];
                                const stderr = [];
                                child.stdout.on("data", (chunk) => stdout.push(chunk));
                                child.stderr.on("data", (chunk) => stderr.push(chunk));
                                child.once("error", reject);
                                child.once("exit", (exitCode) => {
                                    const output = {
                                        exitCode,
                                        stderr: Buffer.concat(stderr),
                                        stdout: Buffer.concat(stdout),
                                    };

                                    if (exitCode === 0) {
                                        resolve(output);
                                        return;
                                    }

                                    const error = new Error(
                                        output.stderr.toString("utf8").trim() ||
                                            output.stdout.toString("utf8").trim() ||
                                            command + " failed.",
                                    );
                                    Object.assign(error, output);
                                    reject(error);
                                });
                            });
                        const shell = {
                            env(nextEnvironment) {
                                environment = nextEnvironment;
                                return shell;
                            },
                            async quiet() {
                                await run();
                            },
                            async text() {
                                const output = await run();
                                return output.stdout.toString("utf8");
                            },
                        };

                        return shell;
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
        setupFiles: ["./vitest-bun.ts"],
    },
});
