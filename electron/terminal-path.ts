import os from "node:os";
import path from "node:path";

export function resolveTerminalCwd(cwd: string) {
    return path.resolve(cwd === "~" ? os.homedir() : cwd);
}
