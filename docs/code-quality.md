# Code quality audit

This audit records structural risks found while documenting the current
architecture. It is ordered by impact, not by ease of implementation. The
project is an early work in progress, so the recommendations favor a durable
contract and clear ownership over small tactical patches.

Snapshot: 2026-07-13.

## Baseline

- `bun run typecheck` passes.
- `bun test` passes 136 tests across 37 files.
- The existing tests provide good coverage for parsing, normalization, stores,
  navigation helpers, query persistence, and visual helper behavior.
- There are no HTTP route contract tests or full backend-to-client integration
  tests.

## Prioritized findings

### P0: The local privileged API trusts every web origin

`src/backend/http/app.ts` enables all origins, headers, and methods. The API
has no session authentication or request capability token. At the same time,
its endpoints can create terminals, write terminal input, run trusted local
scripts, operate on Git repositories, control Docker Compose, read environment
files, open local files, and post GitHub reviews.

Binding the normal backend to loopback reduces network exposure, but it does
not establish a browser-origin trust boundary. The CLI also accepts a custom
host. Electron adds more permissive access-control headers in its web request
hooks instead of narrowing access.

Recommended direction:

1. Generate an unguessable capability token for each backend process and pass
   it to the renderer through the CLI URL or Electron preload bridge.
2. Require the token on every privileged request and SSE connection.
3. Replace wildcard CORS with explicit local UI origins.
4. Refuse non-loopback binding unless the user explicitly opts into a secured
   remote mode.
5. Add integration tests proving that untrusted origins and missing tokens are
   rejected.

### P1: HTTP inputs are cast, not validated

`src/backend/routes.ts` manually casts request bodies and query values. This
provides TypeScript autocomplete inside the route but no runtime guarantee.
Numbers can become `NaN`, strings have inconsistent empty-value checks, enum
actions are trusted after a cast, and the renderer/backend contract can drift
without a compilation error.

Recommended direction:

- Split routes by domain and decode every request with a shared Effect Schema.
- Define request, response, and tagged error contracts in the dedicated
  contracts package.
- Use those schemas from the Elysia and Ky adapters instead of manually
  reproducing endpoint payloads and response types.
- Add route-level tests for invalid bodies, invalid query values, and error
  envelopes.

### P1: Terminal behavior has two implementations

The renderer uses `prRunApi` for HTTP terminal sessions and `EventSource` for
events. Electron still registers a complete second terminal stack:

- `electron/terminal-session-manager.ts`
- terminal IPC handlers in `electron/main.ts`
- terminal methods and subscriptions in `electron/preload.ts`
- duplicated terminal types and busy-state helpers under `electron/`

No renderer call uses these IPC terminal methods. Maintaining both paths
duplicates process discovery, session lifecycle, buffering, input, resize, and
test effort. Fixes can land in one implementation while Electron appears to
remain covered by tests for the other.

Recommended direction: make the HTTP backend the only terminal owner and
remove the unused Electron terminal API after an Electron smoke test confirms
the HTTP path. Keep only `getBackendUrl`, platform information, and window
chrome operations in preload.

### P1: Shared contracts are copied across three type files

The same project, branch, Git, script, and terminal models are copied among
`src/backend/types.ts`, `src/types/pr-run.ts`, and `electron/types.ts`.
`src/backend/types.ts` and `src/types/pr-run.ts` are hundreds of lines each,
and they are already not identical. The Electron copy represents an older,
smaller API shape.

Recommended direction:

- Move transport-safe domain contracts into the Effect Schema contracts
  package that every TypeScript target can include.
- Replace the generic backend `ApiError` with declared tagged errors at the
  domain boundary and a sanitized internal-error transport fallback.
- Derive request and response types from schemas rather than maintaining
  parallel interfaces.
- Delete the Electron copy with the legacy IPC terminal path.

### P1: Navigation has several owners for one state machine

The active screen is represented by URL history, `workspaceView`,
`selectedBranch`, `isOverviewOpen`, `overviewProjectId`, and the active ID in
`useWorkspaceTabsStore`. Event handlers update several of these values in
sequence. This permits transient or persistent impossible combinations, such
as settings plus stale overview state or a selected branch that disagrees with
the active tab.

Recommended direction: represent the current route as one schema-backed
discriminated union and derive the selected project, selected branch, overview
visibility, and settings visibility from it. Let the URL be the persistent
serialization of that state. Keep the tab collection in a focused persistent
Zustand domain and navigate through one semantic action.

### Resolved: The terminal Zustand store performed remote operations

The original `useWorktreeTerminalStore` exceeded 600 lines and called
`prRunApi` directly for session creation, state reads, input, and disposal. It
mixed transport, server state, shared client state, and resource lifetime in
one global store.

`useSshPassphraseStore` also stores executable retry callbacks. Those callbacks
couple unrelated features to a global store through hidden side effects and
make the store difficult to inspect or replay.

Implemented:

- Terminal session snapshots and lifecycle mutations now use TanStack Query.
- SSE decoding, interruption, and finalization now use an Effect
  Stream beneath a focused feature hook.
- Terminal tab metadata and panel layout remain in a focused Zustand store while
  leaving Xterm's imperative DOM instance in a React adapter.
- Model SSH retry as explicit pending operation data or let the initiating
  command own its retry after credential submission; never store executable
  callbacks globally.
- The store no longer imports `prRunApi`; the remaining SSH retry callback
  design is tracked separately in this audit.

### P1: The React root is an application controller

`usePrRunAppState` combines six remote operations, two navigation models,
preferences, terminal cleanup, SSH retry callbacks, dialogs, status summaries,
theme synchronization, and toast/error policy. `PrRunApp` then adds terminal
panel orchestration, responsive layout, persisted dimensions, tab hotkeys, and
several synchronization effects. The two files contain 814 lines together and
touch nearly every frontend state owner.

This flattened controller makes child props broad, gives unrelated changes one
churn hotspot, and encourages effects to synchronize values that should have a
single owner. It is also why frontend features cannot be migrated or tested as
isolated domains.

Recommended direction:

- Make `PrRunApp` the frame and route outlet only.
- Let each feature root read its focused TanStack hooks and narrow Zustand
  selectors, then pass narrow values to visual children.
- Move theme and media-query synchronization into focused browser adapters.
- Model terminal panel, workspace tabs, preferences, dialogs, and navigation as
  separate Zustand domains or URL state rather than returning one
  application-wide state object.
- Split the existing hotspots by responsibility while their domains migrate;
  do not replace the current controller with another global controller.

### P2: Central files have become change hotspots

Several files combine routing, contracts, orchestration, protocol parsing, or
domain logic:

| File                                                 | Approximate lines | Mixed responsibilities                                  |
| ---------------------------------------------------- | ----------------: | ------------------------------------------------------- |
| `src/backend/routes.ts`                              |               727 | Every backend endpoint and validation branch            |
| `src/lib/hooks/store/use-worktree-terminal-store.ts` |               419 | Terminal UI/domain state and immutable updates          |
| `src/backend/handlers/git/github.ts`                 |               590 | GitHub command transport and normalization              |
| `src/backend/handlers/scripts/index.ts`              |               587 | CRUD, inspection, execution, streaming, package scripts |
| `src/backend/handlers/docker/index.ts`               |               586 | Discovery, inspection, command execution, normalization |
| `src/backend/handlers/terminal/pty-worker.cjs`       |               557 | PTY protocol, lifecycle, buffering, process inspection  |

The issue is responsibility density rather than a line-count rule alone.
Changes to unrelated endpoints or protocols converge on the same files and
make ownership and testing harder.

Recommended direction:

- Split HTTP routes and client methods into matching domain modules.
- Keep each folder entry point as the public domain API, with implementations
  one level deeper.
- Separate process transport, normalization/parsing, and orchestration in the
  GitHub, Docker, scripts, and terminal domains.
- Keep pure helpers close to focused unit tests.

The renderer client is now split into `src/lib/api/transport.ts` plus focused
project, Git, review, environment, script, and terminal modules. The
Electron-only terminal implementation was removed; Electron and the browser
now use the same backend terminal protocol. Shared project and transport types
have one source instead of mirrored frontend and backend declarations.

### P2: Promise-based error handling blocks typed recovery

The frontend and backend each contain an identical `tryPromise`
implementation. Both accept `error: any`, erase the operation's error type,
and log every handled rejection as a warning. Expected probes, such as checking
for package-manager lockfiles or trying alternate JSON formats, therefore
produce warning noise in a successful test run.

Other files still use direct `try`/`catch`, `.catch()`, and `void`-prefixed
async calls, which conflicts with the repository's documented error-handling
convention. Some swallowed errors are intentional best-effort behavior, but
the current helper cannot express that distinction.

Recommended direction:

- Use Effect Schema tagged errors for expected failures and preserve defects
  and interruption in `Cause`.
- Wrap promise and callback APIs once inside platform service layers rather
  than at every call site.
- Log only at an observable feature or transport boundary that can add safe
  operation, project, duration, and outcome context.
- Delete both `tryPromise` implementations after the last vertical slice has
  moved. Until then, keep the existing repository convention in unmigrated
  modules instead of creating a third error abstraction.

### P2: The environment schema is unused and incomplete

`src/backend/handlers/env.ts` parses only `PR_RUN_USER_DATA_DIR`, but no module
imports it. Backend code reads many environment variables directly, including
ports, editor selection, SSH commands, GitHub behavior, log level, and script
runner configuration. The schema therefore provides no validation and can
mislead maintainers into believing configuration is centralized.

Recommended direction: create one `AppConfig` Effect service that decodes and
documents every supported variable, supplies redacted secrets, and is provided
to every executable through a live layer. Remove direct environment reads as
their domains migrate.

### Resolved: Configuration writes were not serialized

Project registration previously performed an asynchronous read-modify-write of
`projects.json` without serialization or atomic replacement. Concurrent
add-project requests could overwrite each other, and interrupted writes could
leave a partial file.

`ProjectRepository` now serializes mutations through an Effect semaphore and
writes through a unique temporary file followed by atomic rename. A regression
test performs concurrent additions and proves both projects survive. Runtime
schema decoding of the complete persisted shape remains part of the contracts
migration.

### P2: The route and transport boundary lacks direct tests

The suite tests many pure parsers and state helpers, but it does not create the
Elysia app and exercise requests through `fetch`. As a result, route paths,
body parsing, status codes, response envelope shape, CORS/auth policy, and the
manual `prRunApi` path strings can regress independently of existing tests.

Recommended direction: add a small contract suite per route domain using an
injected handler facade. Add one browser-client compatibility test for each
response shape and streaming protocol.

### P3: Public APIs and folders do not consistently follow repository rules

`src/backend/handlers/project-config.ts` is an export-only wrapper around
same-level code, and several implementation files export many helpers in
addition to their domain facade. The `ui/` and `atoms/` distinction is also not
documented by a code boundary, so generic primitives can drift between both
locations.

Recommended direction: define public folder APIs only when the implementation
lives one level deeper, keep non-public helpers private unless tests require a
deliberate seam, and document whether `ui/` is vendor-owned while `atoms/` is
application-owned.

## Suggested sequence

1. Establish the Effect runtime, contracts package, Ky service, and
   characterization tests while retaining the TanStack Query provider and
   focused Zustand stores.
2. Secure and schema-validate the backend boundary, then migrate configuration
   to an Effect service with atomic writes.
3. Move read-only domains end to end: schema, service, Elysia endpoint, Effect
   client operation, TanStack hook, component, and tests.
4. Move commands beneath TanStack mutations and consolidate navigation into
   one discriminated route value.
5. Add ordered replayable streams, then migrate script and terminal lifecycles.
6. Remove the unused Electron terminal stack and duplicate Electron types.
7. Move all entry-point lifecycles to Effect and delete the compatibility
   stack only after repository-wide checks find no consumers.

The complete target and phase exit conditions are in
[effect-migration.md](./effect-migration.md).

## Static-analysis snapshot

Fallow 2.89.0 analyzed the formatted tree with schema version 7 after the API,
terminal, contract, and React state refactors. The health score is **71.2
(grade B)**, up from 66.6 before the migration.

### Measured signals

| Signal                    | Result | Interpretation                                                         |
| ------------------------- | -----: | ---------------------------------------------------------------------- |
| Files analyzed for health |    271 | Application, Electron, backend, tests, and tooling                     |
| Functions analyzed        |  2,039 | 110 crossed a complexity or static CRAP threshold                      |
| Average maintainability   |   90.9 | Generally healthy local functions despite large orchestration units    |
| Cleanup findings          |     35 | Includes runtime entry points that static discovery cannot prove       |
| Clone groups              |     15 | Reduced from 39 in the initial baseline                                |
| Duplication               |  1.41% | 431 duplicated lines, reduced from 2,198                               |
| Circular dependencies     |      0 | No import cycles detected                                              |
| Unresolved imports        |      0 | Static module resolution is clean                                      |
| Boundary violations       |      0 | No configured boundary policy exists, so this is not proof of layering |

The original largest clone groups are resolved: backend/frontend contracts now
share one source and the duplicate Electron terminal manager no longer exists.
Remaining clones are mostly local validation branches in `routes.ts`, the
temporary duplicate `tryPromise` compatibility helper, and process inspection
shared conceptually between the typed terminal module and its isolated CJS PTY
worker.

The app-state hotspot fell from 76.6 to 66.2 after extracting theme,
sidebar-layout, and project-action hooks. The next frontend hotspots are
`sidebar-project-item.tsx` at 62.5, `main-panel/index.tsx` at 61.7, and
`pr-run-app/index.tsx` at 59.7. The monolithic API client is no longer a hotspot.

The highest function-level complexity readings were:

- `main-panel/index.tsx`: cyclomatic 43, cognitive 26, 354 lines.
- `sidebar-project-item.tsx`: cyclomatic 41, cognitive 37, 365 lines.
- `query-cache-persistence.ts`: cyclomatic 36, cognitive 17, 71 lines.
- `branch-page-header.tsx`: cyclomatic 24, cognitive 23, 286 lines.
- `main-panel/run/index.tsx`: cyclomatic 22, cognitive 23, 342 lines.

The CRAP values in this run use Fallow's static estimated coverage model, not a
real coverage report. They should rank review targets, not be treated as exact
test coverage measurements. `query-cache-persistence.ts`, for example, has
direct tests even though its long key-classification predicate scores as
complex.

### Cleanup findings require runtime verification

Some dead-code results are high-confidence cleanup candidates, including the
unused `env.ts` schema and several unused UI primitives. Others are expected
static-analysis blind spots:

- Electron loads `preload.ts` through a runtime file path.
- `bin/pr-run.cjs` spawns `src/cli/pr-run.ts` through a computed path.
- The scripts handler spawns `scripts/runner.ts` dynamically.
- User-authored scripts import `registerScript` through a generated runtime
  file.
- Semantic Release resolves the `conventionalcommits` preset indirectly.
- The nested `electron/package.json` can make root-owned `node-pty` look
  unlisted for the Electron subtree.

Do not apply Fallow's automatic cleanup across this backlog. Trace each dynamic
entry point or dependency, then either configure the runtime edge or remove
only findings confirmed unused. `effect` is now used by the backend runtime,
project repository, Ky service, and terminal stream; `node-gyp` still needs
runtime verification before removal.
