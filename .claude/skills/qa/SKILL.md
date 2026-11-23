---
name: qa
description: Before a PR that changes a screen, shared UI or a tool in this MCP App (web/, api/tools) — the checklist you run yourself over the branch's diff for bugs and regressions, including every screen that READS what changed, then the template's own checks (biome, tsc, tests, build). No agent: you review, fix, and write one line in the PR body.
paths:
  - "web/**"
  - "api/tools/**"
---

# QA — review your own diff

You do this yourself before `gh pr create`. No subagent: it would re-read
everything you already know.

Look at `git diff origin/main...HEAD` (plus uncommitted) and go down the
list. Fix what you find; what you leave, say why in the PR.

1. **Logic**: wrong condition, off-by-one, null/undefined paths, async not
   awaited, stale state in React effects, wrong `key` in lists.
2. **Readers of what changed**: a tool's output schema, a shared component
   (`web/components`) or `web/context.tsx` / `web/router.tsx` changed → `rg`
   every reader in `web/` and check each still works.
3. **States**: every `McpStatus` (`initializing`, `connected`, `tool-input`,
   `tool-result`, `error`, `tool-cancelled`), plus loading, empty and error
   for each read inside the screen (`ui-components`). Long lists page.
4. **Saving**: optimistic value, pending button, one request per click
   (`saving`); a failure says so and puts the screen back.
5. **Reload**: in Studio (`bun run dev` + `bun start`, connect the tunnel
   URL), go to the screen (tab, filter, drill-down), reload → the same
   screen, same tab and filter. View state lives in the route.
6. **Edge inputs**: empty strings, accents, very long names, many items,
   time zones, double submit, light and dark theme, a narrow host frame.
7. **Checks**, at the root:
   ```bash
   bun run ci:check   # biome lint + format
   bun run check      # tsc --noEmit
   bun test           # the app's tests, if any
   bun test ./.claude/hooks   # the agent hooks (bun skips dot-dirs by default)
   bun run build      # web bundle + server
   ```

In the PR body: `QA: <what you checked> — <found/fixed or "nothing">`.
Couldn't check something (no Studio access, no data, a host you don't
have)? Say so — it goes first in the person's test list.
