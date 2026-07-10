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

1. `stale-worktree`: `branch.hasWorktree === true` and
   `branch.isStale === true`.
    - Label: `Stale Worktree`
    - Color: danger/red
    - Reason: this branch has a local worktree, but the backing branch is stale,
      so it needs the strongest warning.
2. `worktree`: `branch.hasWorktree === true`.
    - Label: `Worktree`
    - Color: success/green
    - Reason: this branch has a local runnable worktree.
3. `stale`: `branch.isStale === true`.
    - Label: `Stale`
    - Color: warning/yellow
    - Reason: this branch is stale but does not have a local worktree.
4. `pull-request`: `branch.source === "pull-request"`.
    - Label: `PR`
    - Color: blue
    - Reason: this item came from an open pull request.
5. `branch`: fallback for every other branch.
    - Label: `Branch`
    - Color: muted
    - Reason: this is a regular branch without a worktree, stale marker, or pull
      request source.

The priority order matters. For example, a pull request that is stale is shown
as `Stale`, and a stale branch with a worktree is shown as `Stale Worktree`.

## Identity and State

The leading position answers who is responsible for a pull request:

- Pull request rows show the PR author's GitHub avatar.
- Hovering or focusing a PR row shows requested reviewers, latest review
  states, and assignees.
- Plain branch and worktree rows do not reserve an identity slot because Git
  does not provide a truthful branch owner.
- Busy terminal state is shown beside the status pill instead of being attached
  to the identity area.

The connector lands on the first meaningful content in each row: the author
avatar for a pull request, or the branch name for every other branch.

## Color Source

Sidebar item colors should be changed only in `sidebar-item-status.ts`.

- `pillClassName` controls the status pill color.

Sidebar pills use the `custom` `StatusPill` tone so the sidebar status config
fully owns the background, border, and text colors.
