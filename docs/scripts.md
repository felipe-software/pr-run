# Scripts

Scripts are global TypeScript files stored in the PR Run user data directory
under `scripts/`. A single script can be run against worktrees from multiple
projects.

Scripts can be created from the sidebar toolbar or from the Run tab of a
branch that already has a worktree. Creation requires a title such as
`Run Expo`. PR Run converts the title to a file-safe slug and appends a UUID:

```text
run-expo-2e60d107-5934-43f7-97d1-748b5eb43275.ts
```

New files contain a neutral scaffold. The body is arbitrary TypeScript and can
use `ctx` to inspect the selected project or worktree and `cmd` to run commands
inside that worktree:

```ts
import { registerScript, tryPromise } from "./_runtime.ts";

registerScript(
    { title: "Run Expo", button: true, lifecycles: [] },
    async (_ctx, cmd) => {
        const [error] = await tryPromise(
            cmd.runOnWorktree(`bun run expo start`),
        );

        return !error;
    },
);
```

Setting `button` to `true` exposes the script in the branch Run tab.
`lifecycles` is reserved for lifecycle-triggered execution.

The script name and Play icon execute it. Edit and Delete actions appear when
the row is hovered or focused. Edit opens the TypeScript source with the
operating system's default plain-text editor.

Script commands are written to the existing worktree terminal session in the
Run tab. Output, ANSI colors, keyboard input, and interruption signals use that
same pseudo-terminal.

Scripts are trusted local code. They run with the same operating-system
permissions and environment as the worktree terminal.
