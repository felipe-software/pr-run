# 010 — Decompose the global terminal panel

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: MEDIUM
- **Category**: Maintainability & architecture
- **Rule**: `react-doctor/no-giant-component`; `react-doctor/only-export-components`
- **Estimated scope**: one file moved into a 4–6 file feature folder

## Problem

After the keyboard accessibility work, `src/lib/components/templates/global-terminal-panel.tsx` exceeds 600 lines and `GlobalTerminalPanel` exceeds 300 lines. It also exports pure terminal-selection helpers from the React component module, preventing safe Fast Refresh.

## Target

Replace the file with the repository's required feature-folder shape:

    global-terminal-panel/
    ├── index.tsx
    ├── terminal-sidebar.tsx
    ├── terminal-resize-handle.tsx
    └── terminal-selection.ts

Keep `index.tsx` as a focused composer under 250 lines. Pure tree/selection/key helpers and types belong in `terminal-selection.ts`; focused visual sections own their narrow props. The folder entry point exports only the component.

## Repo conventions to follow

- Kebab-case React files inside the feature folder.
- Flexbox for layout; no export-only regrouping files.
- Presentational children receive narrow explicit props and do not read API clients.
- Preserve the existing keyboard resize and focus behavior from plan 009.

## Steps

1. Move pure tree/selection/key logic and domain types to `terminal-selection.ts`, updating tests and consumers to import the owner directly.
2. Extract keyboard/pointer resize handles and the terminal tree sidebar into focused components.
3. Keep session actions and selected terminal composition in `index.tsx`.
4. Fix `MainPanel`'s JSX `key` ordering diagnostic while verifying the changed scan.

## Boundaries

- Preserve terminal selection, create/close behavior, keyboard metadata, pointer resizing, and layout.
- Do not change terminal store/query ownership.
- Do not create a public barrel that re-exports internal helpers.

## Verification

- **Mechanical**: full Vitest, typecheck, build, Prettier, and React Doctor changed scan pass; no global-terminal `no-giant-component` or `only-export-components` diagnostic remains.
- **Behavior check**: tree expansion, busy indication, session selection, keyboard/pointer resizing, and terminal creation/closing are unchanged.
- **Done when**: no React file in the feature exceeds 500 lines and the entry point is a small component-only composer.
