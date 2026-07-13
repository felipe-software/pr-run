# 004 — Stabilize terminal lifecycle and polling

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: HIGH
- **Category**: Bugs & correctness
- **Rule**: `react-doctor/no-ref-current-in-render`; `react-doctor/effect-needs-cleanup`; Beyond the scan
- **Estimated scope**: 7–10 files, large

## Problem

`use-terminal-pane.ts:63` mutates `operationsRef.current` during render. React can replay or discard that render while committed terminal listeners observe the uncommitted callbacks. `use-resizable-size.ts:93` installs global pointer listeners and body styles that are only released on pointer-up/cancel, not unmount. Terminal polling also rebuilds owner/tab references for unchanged snapshots, redrawing the root app twice per second, and close/dispose paths discard backend disposal failures before deleting local ownership.

## Target

- Move ref synchronization into an effect (the canonical rule requires render to stay pure), ordered before the terminal lifecycle effect.
- Centralize pointer-drag registration in a hook/helper that returns an idempotent cleanup and invokes it on unmount.
- Preserve Zustand references when a terminal snapshot produces no semantic tab change.
- Do not remove a tab/owner locally until disposal succeeds; allow the caller's existing feature boundary to display the rejection.
- Subscribe the app shell to derived terminal keys/summaries, not the complete owner record.

## Repo conventions to follow

- Use `tryPromise` at Promise feature boundaries.
- Keep terminal server state in TanStack Query and local ownership in the terminal Zustand domain.
- Use narrow store selectors.
- Extend `use-worktree-terminal-store.test.ts` and add a focused pointer-listener test.

## Steps

1. Replace the render-time `operationsRef.current = ...` write with effect synchronization.
2. Extract pointer listener ownership and use it in shared resize and app-terminal resize flows.
3. Make snapshot synchronization return existing tab/owner/store references when values did not change; test referential equality.
4. Dispose sessions before local deletion and propagate failures; parallelize independent owner disposals only if backend semantics allow it.
5. Replace the root `owners` subscription with derived string/summary selectors.

## Boundaries

- Do not convert TanStack Query operations into local state.
- Do not hide disposal errors or make terminal input fire against a stale session.
- Preserve event buffering, sequence handling, and xterm teardown behavior.

## Verification

- **Mechanical**: Vitest tests, typecheck, and React Doctor changed scan clear `no-ref-current-in-render` and the real cleanup diagnostic.
- **Behavior check**: terminal input/resize target the committed session, unmount during drag restores body styles, unchanged polling does not flash the app subtree, and failed disposal leaves the tab reachable.
- **Done when**: terminal resources have explicit ownership and idle polling is referentially stable.
