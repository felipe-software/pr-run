# 006 — Decompose the branch main panel

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: MEDIUM
- **Category**: Maintainability & architecture
- **Rule**: `react-doctor/no-giant-component`
- **Estimated scope**: 4–6 files, medium

## Problem

`src/lib/components/templates/main-panel/index.tsx:54` spans 354 lines and combines URL tab state, branch/activity queries, terminal ownership, SSH retries, cache invalidation, review state, and page rendering.

## Target

Apply the canonical recipe by extracting:

- `use-main-panel-state.ts` for route synchronization, queries, refresh orchestration, and terminal context;
- pure `main-panel-refresh.ts` query-key/refresh planning helpers with Vitest tests;
- `index.tsx` as a focused state/render boundary under 250 lines.

## Repo conventions to follow

- All frontend fetching remains in TanStack Query hooks.
- Promise errors use `tryPromise` at the feature boundary.
- Presentational `branch-page-*` children continue to receive narrow data.

## Steps

1. Extract a pure refresh plan from the active tab and branch identifiers; test all five tabs.
2. Move route/listener/query/SSH retry composition into the focused hook.
3. Keep the component responsible for loading/error selection and composing existing page children.
4. Remove effect-driven resets where a keyed feature boundary or event transition is clearer.

## Boundaries

- Preserve route URLs, cache invalidation keys, terminal docking, and review behavior.
- Do not pass raw query result objects into presentational components.
- Do not add a controller/service layer.

## Verification

- **Mechanical**: no `no-giant-component` diagnostic for `MainPanel`; Vitest and typecheck pass.
- **Behavior check**: each tab refreshes only its owned queries, Back/Forward selects the right tab, and SSH retry registrations clean up.
- **Done when**: query/routing orchestration is independently testable from branch page rendering.
