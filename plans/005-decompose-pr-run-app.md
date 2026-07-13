# 005 — Decompose the application shell

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: MEDIUM
- **Category**: Maintainability & architecture
- **Rule**: `react-doctor/no-giant-component`
- **Estimated scope**: 5–7 files, medium

## Problem

`src/lib/components/templates/pr-run-app/index.tsx:41` spans more than 420 lines and owns viewport state, hotkeys, terminal panel state, two drag flows, persistence, workspace composition, and dialogs. `app-dialogs.tsx:7` accepts the entire inferred app-state facade while reading only dialog fields.

## Target

Following the canonical rule recipe, extract logical sections into focused owners:

- `use-terminal-panel-state.ts` for terminal panel selection/open/size behavior;
- `app-workspace.tsx` for sidebar and workspace composition;
- narrow explicit props for `AppDialogs`;
- `index.tsx` as the feature entry point and shell composer, under 250 lines.

## Repo conventions to follow

- Keep files kebab-case in the existing child folder.
- Feature components may read their domain store/query; visual children receive narrow props.
- Do not pass an entire store, query result, or flattened application state object as one prop.
- Reuse `terminal-state.ts` pure helpers.

## Steps

1. Move terminal panel state and commands behind a focused feature hook.
2. Extract workspace/sidebar/main-panel composition without introducing a generic controller.
3. Replace `AppDialogs state={state}` with its actual dialog props.
4. Keep `PrRunApp` responsible only for top-level loading/error selection and composition.
5. Add pure Vitest coverage for terminal selection/size transitions that are extracted.

## Boundaries

- Preserve user-visible layout and hotkeys.
- Do not move server state into local/Zustand state.
- Do not add export-only files.

## Verification

- **Mechanical**: `PrRunApp` no longer triggers `no-giant-component`; tests and typecheck pass.
- **Behavior check**: sidebar, overview/settings/branch switching, terminal panel docking, resizing, and dialogs behave unchanged.
- **Done when**: each extracted file has one clear owner and the root component is a small composer.
