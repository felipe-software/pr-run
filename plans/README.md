# React refactor plans

| Plan                                           | Status | Depends on                     |
| ---------------------------------------------- | ------ | ------------------------------ |
| 001 — Secure the local authority boundary      | DONE   | 002 for final test runner only |
| 002 — Migrate the complete suite to Vitest     | DONE   | —                              |
| 003 — Unify workspace navigation state         | DONE   | 002                            |
| 004 — Stabilize terminal lifecycle and polling | DONE   | 002                            |
| 005 — Decompose the application shell          | DONE   | 003, 004                       |
| 006 — Decompose the branch main panel          | DONE   | 002                            |
| 007 — Decompose the run feature                | DONE   | 002                            |
| 008 — Decompose sidebar project rows           | DONE   | 002                            |
| 009 — Fix primary keyboard navigation          | DONE   | 005, 008                       |
| 010 — Decompose the global terminal panel      | DONE   | 004, 009                       |

Recommended execution order: 002 → 001 → 003 and 004 → 005, 006, 007, and 008 → 009 → 010. Re-run the full suite and React Doctor after every dependency wave.
