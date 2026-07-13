# 008 — Decompose sidebar project rows

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: MEDIUM
- **Category**: Maintainability & architecture
- **Rule**: `react-doctor/no-giant-component`; `react-doctor/no-many-boolean-props`
- **Estimated scope**: 5–7 files, medium

## Problem

`sidebar-project-item.tsx:45` spans more than 360 lines and mixes branch querying, SSH retry ownership, animation, sorting/filtering, project controls, and branch rendering. Its boolean-heavy API multiplies selected/busy/expanded/updating combinations.

## Target

Following the canonical component split recipe, keep query/feature ownership in the project boundary and extract focused visual children such as:

- `sidebar-project-header.tsx`;
- `sidebar-project-branches.tsx`;
- an explicit pending-action model instead of independent action booleans where states are mutually exclusive.

## Repo conventions to follow

- Files remain inside `src/lib/components/templates/sidebar/` and use kebab-case.
- Pure branch ordering stays in `sidebar-sort.ts` with Vitest tests.
- Visual children do not read API clients or whole application stores.

## Steps

1. Identify the real project header, branch list, and empty/loading sections and extract them.
2. Replace mutually exclusive checkout/remove booleans passed to rows with a discriminated action state or explicit variant.
3. Preserve narrow query/store selectors and SSH retry cleanup at the owning boundary.
4. Extend sidebar tests for pending action derivation and branch visibility.

## Boundaries

- Preserve sorting, collapse behavior, project update/remove/checkout semantics, and animations.
- Do not move query data into Zustand.
- Do not create export-only re-grouping files.

## Verification

- **Mechanical**: the project component clears `no-giant-component`; tests and typecheck pass.
- **Behavior check**: each project expands, refreshes, checks out, removes, and highlights branches exactly as before.
- **Done when**: project orchestration and branch visuals are separate, testable responsibilities.
