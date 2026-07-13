# 003 — Unify workspace navigation state

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: HIGH
- **Category**: Bugs & correctness
- **Rule**: Beyond the scan; `react-doctor/exhaustive-deps`
- **Estimated scope**: 6–8 files, large

## Problem

`src/lib/components/templates/pr-run-app/workspace-state.ts:25` gives workspace navigation four owners: the URL, `selectedBranch`, `isOverviewOpen`, and `overviewProjectId`. Settings add another owner in `settings-state.ts:10`. The invalid-deep-link effect also reads `projects.length` without depending on it:

    if (!selectedBranch || selectedProject || projects.length === 0) return;
    // deps: [selectedBranch, selectedProject]

Back/Forward changes the rendered branch but does not activate the matching workspace tab.

## Target

Create one domain state modeled as a discriminated union:

    type WorkspaceView =
        | { type: "overview"; projectId?: string }
        | { type: "branch"; projectId: string; branchName: string }
        | { type: "settings"; section: SettingsSection };

Own it in a small `use-workspace-navigation-store.ts` with semantic actions. Derive selected project/branch views during render. URL events hydrate one transition, and branch transitions synchronize `useWorkspaceTabsStore.activeTabId`.

## Repo conventions to follow

- Zustand store in `src/lib/hooks/store`, one domain per file, state/types/semantic actions together.
- Store only client navigation state; never store query results or project objects.
- Use narrow selectors and derive selected project from query data.
- Imitate `src/lib/hooks/store/use-workspace-tabs-store.test.ts`.

## Steps

1. Add the discriminated union store and tests for overview, branch, settings, and history hydration.
2. Refactor `useWorkspaceState` to synchronize URL/history and tabs around that single view.
3. Remove the separate settings state owner and duplicated overview booleans.
4. Update `usePrRunAppState`, `PrRunApp`, and consumers to branch on `workspaceView.type`.
5. Ensure project loading invalidates a missing deep-linked project by including the actual project-list readiness source.

## Boundaries

- Do not put server/query data in Zustand.
- Preserve existing URLs and worktree tab persistence.
- Do not copy mutation state into the navigation store.

## Verification

- **Mechanical**: focused store tests, full Vitest suite, typecheck, and React Doctor changed scan pass.
- **Behavior check**: direct branch links, Back/Forward, closing the selected tab, settings return, and a missing project all select exactly one view and the correct active tab.
- **Done when**: the URL, rendered workspace, and active worktree tab cannot disagree.
