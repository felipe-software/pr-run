# 002 — Migrate the complete suite to Vitest

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: HIGH
- **Category**: Maintainability & architecture
- **Rule**: Beyond the scan
- **Estimated scope**: package/config plus 36 test files, mechanical

## Problem

`package.json:46` runs `bun test`, Vitest is absent, and every test imports from `bun:test`:

    "test": "bun test"

The requested Vitest safety net therefore does not exist.

## Target

    "test": "vitest run",
    "test:watch": "vitest"

Add `vitest` with Bun, configure the `@` alias and Node test environment in `vitest.config.ts`, and migrate every `bun:test` import to `vitest` without changing assertions or behavior.

## Repo conventions to follow

- Always use Bun: `bun add --dev vitest` and `bun run test`.
- Keep test files beside their owners and preserve current test naming.
- Use the existing alias target from `vite.config.ts`.

## Steps

1. Add Vitest as a development dependency with Bun.
2. Add a focused `vitest.config.ts` with the `@` alias, Node environment, mock restoration, and `*.test.ts(x)` inclusion.
3. Replace all `bun:test` imports with equivalent Vitest imports, including `spyOn`.
4. Run the entire suite and resolve only genuine runner compatibility issues.

## Boundaries

- Do not add Jest, npm, Yarn, or pnpm.
- Do not weaken or delete existing tests.
- Do not add a DOM environment until a test actually needs it.

## Verification

- **Mechanical**: `bun run test` collects all 36 files and at least the existing 131 tests; `rg 'bun:test'` returns no matches; typecheck passes.
- **Behavior check**: temp-directory, query-cache, and store tests retain their current behavior under Vitest.
- **Done when**: Vitest is the only test runner used by the repository scripts and the migrated suite is green.
