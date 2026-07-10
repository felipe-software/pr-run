# Sidebar Item

Sidebar branch items are split into small components under
`src/lib/components/templates/sidebar`:

- `sidebar-branch-item.tsx` renders the clickable row, branch name, status pill,
  last commit age, and worktree removal action.
- `sidebar-pr-people-tooltip.tsx` renders a PR author's avatar and the compact
  review-workflow tooltip.
- `sidebar-pr-people.ts` merges requested reviewers, latest reviewers, and
  assignees into the tooltip's related-people list.
- `sidebar-item-status.ts` classifies each branch item and stores the sidebar
  label and pill color classes in one place.
- `sidebar-project-item.tsx` groups branch items by project and decides which
  stale items are visible.

## Classification

`getSidebarItemStatus` classifies a `BranchInfo` using this priority order:

1. `draft`: the branch belongs to an open draft pull request.
    - Label: `Draft`
    - Color: muted/neutral
2. `open`: the branch belongs to an open, review-ready pull request.
    - Label: `Open`
    - Color: success/green
3. `closed`: the branch belongs to a closed, unmerged pull request.
    - Label: `Closed`
    - Color: danger/red
4. `merged`: the branch belongs to a merged pull request.
    - Label: `Merged`
    - Color: done/violet
5. `stale`: a non-PR branch where `branch.isStale === true`.
    - Label: `Stale`
    - Color: warning/yellow
6. `branch`: fallback for every other non-PR branch.
    - Label: `Branch`
    - Color: muted

Pull request state always owns the pill. Worktree and stale metadata never
replace `Draft`, `Open`, `Closed`, or `Merged`.

Open pull requests are always listed, preserving the previous behavior.
Historical closed and merged pull requests enrich only branches that still
exist on `origin`, so deleted PR head branches do not create unusable rows.

## Identity and State

The leading position answers who is responsible for a pull request:

- Pull request rows show the PR author's GitHub avatar.
- Hovering or focusing a PR row shows requested reviewers, latest review
  states, and assignees.
- Plain branch and worktree rows do not reserve an identity slot because Git
  does not provide a truthful branch owner.
- Non-PR branch names use reduced opacity at rest and return to full foreground
  on hover, keyboard focus, or selection.
- Busy terminal state is shown beside the status pill instead of being attached
  to the identity area.

Worktree presence is separate from the status pill. A small circle immediately
before the status pill uses the owning project's generated gradient. The marker
is visual-only; the row's accessible label includes the worktree state.

The connector lands on the first meaningful content in each row: the author
avatar for a pull request, or the branch name for every other branch.

## Color Source

Sidebar item colors should be changed only in `sidebar-item-status.ts`.

- `pillClassName` controls the status pill color.

Sidebar pills use the `custom` `StatusPill` tone so the sidebar status config
fully owns the background, border, and text colors.
