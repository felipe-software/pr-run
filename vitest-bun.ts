import { spawn } from "node:child_process";
import { glob, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

class NodeGlob {
    constructor(private readonly pattern: string) {}

    async *scan(options: { cwd: string; onlyFiles?: boolean }) {
        for await (const match of glob(this.pattern, { cwd: options.cwd })) {
            if (
                options.onlyFiles &&
                !(await stat(path.join(options.cwd, match))).isFile()
            ) {
                continue;
            }

            yield match;
        }
    }
}

function spawnWithWebStreams(
    command: string[],
    options: {
        cwd?: string;
        env?: Record<string, string | undefined>;
        stdin?: "pipe";
    },
) {
    const child = spawn(command[0]!, command.slice(1), {
        cwd: options.cwd,
        env: options.env,
        stdio: [options.stdin === "pipe" ? "pipe" : "ignore", "pipe", "pipe"],
    });
    const exited = new Promise<number>((resolve) => {
        child.once("error", () => resolve(1));
        child.once("exit", (code) => resolve(code ?? 1));
    });

    return {
        exited,
        stdin: child.stdin,
        kill: () => child.kill(),
        stderr: Readable.toWeb(child.stderr),
        stdout: Readable.toWeb(child.stdout),
    };
}

Object.defineProperty(globalThis, "Bun", {
    configurable: true,
    value: {
        env: process.env,
        gc: () => undefined,
        Glob: NodeGlob,
        spawn: spawnWithWebStreams,
    },
    writable: true,
});
