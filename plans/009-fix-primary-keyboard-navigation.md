# 009 — Fix primary keyboard navigation

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Rule**: `react-doctor/role-supports-aria-props`; Beyond the scan
- **Estimated scope**: 7–10 files, medium

## Problem

The branch and worktree tablists lack roving focus/arrow navigation, terminal resizers are pointer-only, inactive terminal close buttons can receive invisible focus, terminal tree buttons remove focus outlines, and the branch selector uses ignored `aria-selected` on a plain button.

## Target

- Implement reusable pure tab-key navigation (`ArrowLeft/Right`, `Home`, `End`) and roving `tabIndex` for both tablists.
- Associate branch tabs with their active panel or stop claiming tab semantics if the UI cannot implement the pattern completely.
- Make terminal separators focusable with orientation/value metadata and keyboard increments.
- Add `focus-visible` styles and reveal inactive close buttons on `group-focus-within`.
- Replace branch-button `aria-selected` with valid current-page semantics.

## Repo conventions to follow

- Keep UI text and accessible names in English.
- Prefer native semantics; use roles only where the complete interaction model is implemented.
- Put reusable pure keyboard logic next to the feature and test it with Vitest.

## Steps

1. Add/test the roving tab target calculation.
2. Wire keyboard navigation and `tabIndex` into branch and worktree tabs.
3. Add keyboard behavior and ARIA values to both terminal separators.
4. Restore visible focus for terminal tree/close controls.
5. Correct branch current-state semantics and use native `ul`/`li` for the activity feed when virtualization remains valid.
6. Add a reduced-motion override for shared infinite animation/scroll behavior.

## Boundaries

- Preserve pointer drag and mouse selection.
- Do not remove accessible names or keyboard-reachable destructive actions.
- Do not emulate semantics with incomplete roles.

## Verification

- **Mechanical**: keyboard helper tests, full Vitest suite, typecheck, and React Doctor changed scan pass.
- **Behavior check**: keyboard-only users can move among tabs, resize terminals, see every focused control, select the current branch, and use reduced-motion preferences.
- **Done when**: primary navigation and terminal controls are fully visible and operable without a pointer.
