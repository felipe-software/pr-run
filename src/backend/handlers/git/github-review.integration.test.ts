import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
    addPullRequestComment,
    addPullRequestReviewComment,
    discardPendingPullRequestReview,
    submitPullRequestReview,
} from "@/backend/handlers/git/github-review";

const project = { id: "project", name: "Project", path: "/tmp/project" };
const repository = {
    nameWithOwner: "example/repository",
    url: "https://github.com/example/repository",
};

let temporaryDirectory = "";
let originalPath: string | undefined;

const fakeGh = `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const input = fs.readFileSync(0, "utf8");
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({ args, input }) + "\\n");

if (process.env.FAKE_GH_FAIL === "1") {
    process.stderr.write("GitHub mutation failed");
    process.exit(1);
}

if (args[0] === "pr" && args[1] === "view") {
    process.stdout.write(JSON.stringify({ headRefOid: "head-oid", reviewDecision: "REVIEW_REQUIRED" }));
    process.exit(0);
}

const endpoint = args[1];
const methodIndex = args.indexOf("--method");
const method = methodIndex === -1 ? "GET" : args[methodIndex + 1];

if (endpoint === "user") {
    process.stdout.write(JSON.stringify({ login: "viewer" }));
} else if (endpoint === "graphql") {
    process.stdout.write(JSON.stringify({
        data: {
            addPullRequestReviewThread: {
                thread: { comments: { nodes: [{ databaseId: 77, url: "https://github.com/comment/77" }] } }
            }
        }
    }));
} else if (method === "DELETE") {
    process.stdout.write("{}");
} else if (method === "POST") {
    process.stdout.write(JSON.stringify({ id: 42, node_id: "review-node", html_url: "https://github.com/mutation/42" }));
} else if (endpoint.endsWith("/issues/9/comments")) {
    process.stdout.write("[[]]");
} else if (endpoint.endsWith("/pulls/9/reviews")) {
    process.stdout.write(process.env.FAKE_PENDING_REVIEW === "1"
        ? JSON.stringify([[{ id: 12, node_id: "pending-node", state: "PENDING", user: { login: "viewer" }, body: "draft" }]])
        : "[[]]");
} else if (endpoint.endsWith("/pulls/9/comments")) {
    process.stdout.write("[[]]");
} else if (endpoint.endsWith("/pulls/9/commits")) {
    process.stdout.write('[[{"sha":"head-oid"}]]');
} else {
    process.stdout.write("{}");
}
`;

beforeEach(async () => {
    temporaryDirectory = await mkdtemp(
        path.join(os.tmpdir(), "pr-run-gh-review-"),
    );
    const executable = path.join(temporaryDirectory, "gh");
    await writeFile(executable, fakeGh);
    await chmod(executable, 0o755);
    originalPath = process.env.PATH;
    process.env.PATH = `${temporaryDirectory}:${originalPath ?? ""}`;
    process.env.FAKE_GH_LOG = path.join(temporaryDirectory, "calls.jsonl");
    project.path = temporaryDirectory;
    delete process.env.FAKE_GH_FAIL;
    delete process.env.FAKE_PENDING_REVIEW;
});

afterEach(async () => {
    process.env.PATH = originalPath;
    delete process.env.FAKE_GH_LOG;
    delete process.env.FAKE_GH_FAIL;
    delete process.env.FAKE_PENDING_REVIEW;
    await rm(temporaryDirectory, { force: true, recursive: true });
});

async function calls() {
    return (await readFile(process.env.FAKE_GH_LOG!, "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { args: string[]; input: string });
}

describe("GitHub review mutations", () => {
    test("adds a general comment with the exact REST payload", async () => {
        await expect(
            addPullRequestComment(project, repository, 9, "General feedback"),
        ).resolves.toEqual({
            id: 42,
            url: "https://github.com/mutation/42",
        });

        expect(await calls()).toContainEqual({
            args: [
                "api",
                "repos/example/repository/issues/9/comments",
                "--method",
                "POST",
                "--input",
                "-",
            ],
            input: JSON.stringify({ body: "General feedback" }),
        });
    });

    test("adds an immediate multiline review comment at the head commit", async () => {
        await expect(
            addPullRequestReviewComment(project, repository, 9, {
                body: "Please update this range",
                line: 12,
                mode: "immediate",
                path: "src/app.ts",
                side: "RIGHT",
                startLine: 10,
            }),
        ).resolves.toMatchObject({ id: 42 });

        const mutation = (await calls()).find(
            (call) =>
                call.args.includes(
                    "repos/example/repository/pulls/9/comments",
                ) && call.args.includes("POST"),
        );
        expect(JSON.parse(mutation!.input)).toEqual({
            body: "Please update this range",
            commit_id: "head-oid",
            line: 12,
            path: "src/app.ts",
            side: "RIGHT",
            start_line: 10,
            start_side: "RIGHT",
        });
    });

    test("creates a pending review and adds a GraphQL thread", async () => {
        await expect(
            addPullRequestReviewComment(project, repository, 9, {
                body: "Pending feedback",
                line: 4,
                mode: "pending",
                path: "src/app.ts",
                side: "LEFT",
            }),
        ).resolves.toEqual({
            id: 77,
            url: "https://github.com/comment/77",
        });

        const mutationCalls = await calls();
        expect(
            mutationCalls.some(
                (call) =>
                    call.args[1] ===
                        "repos/example/repository/pulls/9/reviews" &&
                    call.args.includes("POST"),
            ),
        ).toBe(true);
        const graphql = mutationCalls.find((call) =>
            call.args.includes("graphql"),
        );
        expect(JSON.parse(graphql!.input).variables.input).toMatchObject({
            body: "Pending feedback",
            pullRequestReviewId: "review-node",
            side: "LEFT",
        });
    });

    test("submits and discards an existing pending review", async () => {
        process.env.FAKE_PENDING_REVIEW = "1";

        await expect(
            submitPullRequestReview(
                project,
                repository,
                9,
                "APPROVE",
                " Approved ",
            ),
        ).resolves.toMatchObject({ id: 42 });
        await expect(
            discardPendingPullRequestReview(project, repository, 9),
        ).resolves.toEqual({ id: 12 });

        const mutationCalls = await calls();
        expect(
            mutationCalls.some((call) =>
                call.args.includes(
                    "repos/example/repository/pulls/9/reviews/12/events",
                ),
            ),
        ).toBe(true);
        expect(
            mutationCalls.some(
                (call) =>
                    call.args.includes(
                        "repos/example/repository/pulls/9/reviews/12",
                    ) && call.args.includes("DELETE"),
            ),
        ).toBe(true);
    });

    test("preserves domain errors and wraps gh command failures", async () => {
        await expect(
            discardPendingPullRequestReview(project, repository, 9),
        ).rejects.toMatchObject({ code: "REVIEW_NOT_FOUND", status: 404 });

        process.env.FAKE_GH_FAIL = "1";
        await expect(
            addPullRequestComment(project, repository, 9, "feedback"),
        ).rejects.toMatchObject({
            code: "GITHUB_INTEGRATION_FAILED",
            details: "GitHub mutation failed",
            status: 502,
        });
    });
});
