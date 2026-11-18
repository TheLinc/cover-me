# Notes for coding agents

Write a comment only when the code can't say why, and link the ticket, PR or ADR that holds the reason (`#123`, a URL, `docs/adr/`). Delete a comment that says what the code does. A ticket number doesn't make it necessary.

`scripts/check-comments.mjs` fails CI on unlinked comments in every file a pull request changes, old ones included. `pnpm lint` in `extension/` or `web/` runs it on your working tree.
