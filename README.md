# PR-run (Work in progress)

The app made for people who review multiple Pull Requests every day. Think Github PRs + Worktrees integrated into one place.

<img height="560" alt="image" src="https://github.com/user-attachments/assets/e3d92fe1-a51e-4f9b-8762-55ee692da27b" />

<br>

[![Publish npm package](https://github.com/felipe-software/pr-run/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/felipe-software/pr-run/actions/workflows/publish-npm.yml)
[![Version Bump](https://github.com/felipe-software/pr-run/actions/workflows/version-bump.yaml/badge.svg)](https://github.com/felipe-software/pr-run/actions/workflows/version-bump.yaml)
<br>

## How to run

PR-run requires [Bun](https://bun.sh/docs/installation).

```bash
bunx pr-run@latest
```
This starts the local backend, serves the browser UI.

## Why?

When reading diffs on github isn't enough, you may need to run a PR in your local machine. So you have to: <br>
- Manually create a worktree.
- Manually set up a .env
- Manually start/stop docker containers.
And when testing PRs e2e (like a web app pointing to an API) you have to make sure everything is working right.<br>

I don't know if someone already solved this problem, but I lost so much time doing this manually that I decided to create my own solution.

## Dependencies
GitHub CLI (`gh`), Docker, and editor CLIs are optional and are only needed for the workflows that use them.
<br><br>

This project copies a lot of things from [t3code](https://github.com/pingdotgg/t3code)<br>
Feel free to open PRs, issues or suggest features. This is my first serious open source project :)
