#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const bunCheck = spawnSync("bun", ["--version"], {
    stdio: "ignore",
});

if (bunCheck.error) {
    process.stderr.write(`pr-run requires Bun to run.

Install Bun from https://bun.sh/docs/installation and run:
  bunx pr-run
`);
    process.exit(1);
}

const child = spawn(
    "bun",
    [path.join(packageRoot, "src/cli/pr-run.ts"), ...process.argv.slice(2)],
    {
        cwd: packageRoot,
        stdio: "inherit",
    },
);

child.on("error", (error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
