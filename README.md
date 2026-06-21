# PR-run (Work in progress)

The app made for people who review multiple Pull Requests every day.

<img width="1030" height="620" alt="image" src="https://github.com/user-attachments/assets/03bfd05f-ddd9-457b-8129-09f052272183" />
<br>

When reading diffs on github isn't enough, you may need to run a PR in your local machine. So you have to: <br>

- Manually create a worktree.
- Manually set up a .env
- Manually start/stop docker containers.
  <br>
  And when testing PRs e2e (like a web app pointing to an API) you have to make sure everything is working right.<br>
  <br>
  I don't know if someone already solved this problem, but I lost so much time doing this manually that I decided to create my own solution.

## General View (Create worktree, commits history, overall activity)

<img width="1918" height="1055" alt="general" src="https://github.com/user-attachments/assets/0517d5f6-7de4-42a4-8354-87fdbac5398c" />

## Scripts

Typescript files that can be manually or automatically executed. You can also use it for shell commands, like "npm install", "rm -r node_modules"<br>
<img width="759" height="275" alt="image" src="https://github.com/user-attachments/assets/f2d96a26-211c-4cc4-b291-2a7fda7838c7" />
<img width="1917" height="1050" alt="scripts" src="https://github.com/user-attachments/assets/2a0c2e6b-b4e1-4272-bcfe-3fa1ffa21343" />

## Diffs

A standard diff view that doesn't crash your computer if the PR is too big (yeah, github diff view sucks)
<img width="1918" height="1050" alt="diffs" src="https://github.com/user-attachments/assets/86509d97-dfe3-46ec-92b0-5df67fdeb59b" />

This project copies a lot of things from [t3code](https://github.com/pingdotgg/t3code)
Feel free to open PRs :)
