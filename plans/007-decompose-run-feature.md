# 007 — Decompose the run feature

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: MEDIUM
- **Category**: Maintainability & architecture
- **Rule**: `react-doctor/no-giant-component`
- **Estimated scope**: 5–7 files, medium

## Problem

`src/lib/components/templates/main-panel/run/index.tsx:51` combines two queries, four mutations, favorites, command preparation/execution, toasts, picker state, and deletion confirmation in one 340-line component.

## Target

Extract logical sections as required by the canonical recipe:

- a feature hook for mutation composition and nearest-boundary errors;
- focused favorite/package/custom-script sections;
- pure script grouping/filtering helpers with Vitest coverage;
- an `index.tsx` composer under 250 lines.

## Repo conventions to follow

- Queries/mutations stay in `src/lib/hooks/query` and own invalidation.
- The feature invoking a mutation composes it with local UI behavior using `tryPromise`.
- Local picker/delete state stays local; favorites stay in their persisted domain store.

## Steps

1. Extract and test pure derived script lists and grouping.
2. Extract command execution/deletion composition into a specific feature hook.
3. Extract focused visual sections with narrow props.
4. Keep the entry point as the feature composer.

## Boundaries

- Preserve command strings, terminal execution behavior, favorites ordering, and confirmations.
- Do not copy mutation variables/loading/errors into local state.
- Do not add a generic action service.

## Verification

- **Mechanical**: no `no-giant-component` diagnostic for `WorktreeRun`; Vitest and typecheck pass.
- **Behavior check**: package/custom scripts execute in the correct terminal, favorites stay stable, and delete errors remain at the run feature.
- **Done when**: mutations and sections can be reasoned about independently.
