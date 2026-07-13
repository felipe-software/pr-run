# 001 — Secure the local authority boundary

- **Status**: DONE
- **Commit**: 12f8b70
- **Severity**: HIGH
- **Category**: Security
- **Rule**: Beyond the scan (`react-doctor/local-rpc-native-bridge-risk` confirms the boundary)
- **Estimated scope**: 6–8 files, medium

## Problem

`src/backend/http/app.ts:12` reflects every browser origin into a backend that can create terminals, write input, edit scripts, and run commands:

    cors({
        allowedHeaders: true,
        methods: "*",
        origin: true,
    })

`src/lib/api/transport.ts:246` also accepts and persists any parseable `?api=` URL. The same client sends the SSH passphrase to that selected backend at line 318. `electron/main.ts:261` opens every renderer-created URL through the OS without validating its protocol.

## Target

- Reject browser requests whose `Origin` is not an approved loopback renderer origin before routes run, while preserving Electron/native requests and configured local development.
- Accept backend override URLs only when they use `http:` and a loopback hostname (`127.0.0.1`, `localhost`, or `[::1]`). Never persist an attacker-controlled remote origin.
- Open external renderer links only for `https:` and `http:` URLs.
- Move the release token in `.github/workflows/version-bump.yaml` from job scope to only the steps that need it, and install dependencies before exposing that token.

## Repo conventions to follow

- Put backend policy logic in `src/backend/http/`, not in route handlers.
- Export grouped helpers only when the file owns the domain.
- Use `tryPromise` for Promise failures; keep migrated Effect failures in Effect's typed channel.
- Imitate focused helper tests such as `src/backend/handlers/git/github-media.test.ts`.

## Steps

1. Extract pure loopback URL/origin validation helpers with explicit handling for IPv4, `localhost`, and IPv6 loopback.
2. Apply the request-origin gate in `createBackendApp`; return a clear 403 error before privileged routes execute.
3. Reuse the loopback validator in the renderer backend URL resolver and ignore/remove invalid stored overrides.
4. Add an external-link protocol allowlist before `shell.openExternal`.
5. Scope the release token to checkout/release steps, after dependency installation.
6. Add Vitest tests for accepted and rejected origins/backend URLs/protocols.

## Boundaries

- Do not add a remote backend mode.
- Do not expose secrets in URLs, local storage, or logs.
- Preserve normal Vite-on-loopback and Electron startup behavior.

## Verification

- **Mechanical**: `bun run test`, `bun run typecheck`, and `bunx react-doctor@latest --scope changed --include-untracked --no-score` pass.
- **Behavior check**: the existing local renderer reaches `/health`; a request with `Origin: https://example.com` receives 403; remote `?api=https://example.com` is ignored.
- **Done when**: privileged loopback routes cannot be invoked from an arbitrary web origin and external links are scheme-limited.
