---
name: migrate-template
description: Use when the user asks to update their MCP App to the latest template version, sync with upstream template, pull in template changes, upgrade the template, or migrate to a newer version of the MCP App template.
---

# Migrating to Latest Template Version

Template remote: `git@github.com:decocms/mcp-app.git`. Fetch latest, analyze changes with parallel subagents, present migration plan, apply after user approval.

## Workflow

1. Fetch template remote
2. Find base commit (when user forked/cloned)
3. Get changelog (base → latest)
4. **Dispatch 5 analysis subagents in parallel**
5. Present migration plan — **wait for user approval**
6. Apply changes (subagents per category)
7. Verify: `bun install && bun run check && bun run ci:check && bun run build && bun test . ./.claude/hooks`

## Step 1–3: Setup & Changelog

```bash
git remote add template git@github.com:decocms/mcp-app.git 2>/dev/null || true
git fetch template main

# Find base commit (try in order):
git merge-base HEAD template/main                # A: shared history
git log --oneline --reverse | head -5             # B: check initial commit
# C: ask user which version they started from

# Changelog:
git log --oneline <base>..template/main
git diff <base>..template/main --stat
```

If no common ancestor (GitHub "Use this template"), diff full template against user's code file-by-file.

## Step 4: Dispatch 5 Analysis Subagents (ALL IN PARALLEL)

Each subagent compares `<base>..template/main` for its file category, checks if user also modified those files, and recommends **APPLY** (no conflict), **MERGE** (both sides changed), or **SKIP** (user deleted/replaced). Output as markdown table.

| # | Category | Files to Analyze |
|---|----------|-----------------|
| 1 | **Infrastructure** | `vite.config.ts`, `tsconfig.json`, `biome.json`, `package.json` scripts, `.github/workflows/*`, `scripts/*`, `index.html` |
| 2 | **Dependencies** | `package.json` deps/devDeps — new, removed, version bumps (flag breaking major bumps) |
| 3 | **Framework Core** | `web/context.tsx`, `web/router.tsx`, `web/types.ts`, `web/app.tsx`, `web/lib/tools.ts`, `api/app.ts`, `api/types/env.ts`, `api/resources/*` |
| 4 | **UI Components** | `web/components/ui/*`, `web/lib/*`, `web/hooks/*`, `web/globals.css` (shadcn = usually safe to replace; `globals.css` carries the design-system utilities the skills use) |
| 5 | **Docs, Skills & Hooks** | `AGENTS.md` (`CLAUDE.md` is a symlink to it), `README.md`, `.claude/skills/**/*`, `.claude/hooks/*`, `.claude/settings.json` |

## Step 5: Migration Plan

Compile subagent results into:

```markdown
## Migration Plan: <base_short> → <latest_short>
- X commits, Y files changed
1. **Auto-apply** (no conflicts): [files]
2. **Merge required** (user also modified): [files]
3. **Skip** (user deleted/replaced): [files]
4. **Manual review** (breaking changes): [files]
### Breaking Changes: [list]
```

**Present to user. Do NOT apply until approved.**

## Step 6: Apply Changes

### Apply order: deps → infra → framework → UI → docs

- **Auto-apply**: `git checkout template/main -- <file>`
- **Merge-required**: Dispatch subagent per file — read user's version, template's version, and base version. Merge preserving user's custom additions (tools, routes, resources) while adopting template structural updates.
- **package.json**: Merge deps (keep user's custom, update template's). Run `bun install`.

## Step 7: Verify & Fix

```bash
bun install && bun run check && bun run ci:check && bun run build && bun test . ./.claude/hooks
```

If checks fail, dispatch a subagent to diagnose: template incompatibility, bad merge, or missing dep.

## File Categories Reference

| Category | Files | Strategy |
|----------|-------|----------|
| Infrastructure | `vite.config.ts`, `tsconfig.json`, `biome.json`, `index.html` | Replace |
| Build Scripts | `package.json` scripts | Merge (user-added scripts, e.g. a deploy target's) |
| Dependencies | `package.json` deps/devDeps | Merge (keep user's, update template's) |
| Framework Core | `web/context.tsx`, `web/router.tsx`, `web/types.ts`, `web/app.tsx`, `web/lib/tools.ts` | Merge carefully (`router.tsx`: keep the user's `TOOL_PAGES` entries and routes) |
| Server Core | `api/app.ts`, `api/types/env.ts` | Merge carefully (keep the user's `resources` and `prompts`) |
| UI Components | `web/components/ui/*`, `web/lib/*` | Replace (shadcn standard) |
| Example Tool | `api/tools/hello.ts`, `api/resources/hello.ts`, `api/prompts/hello.ts`, `web/tools/hello/` | Skip if user deleted |
| User Tools | `api/tools/*`, `api/resources/*`, `web/tools/*` (non-hello) | Never overwrite |
| CI/CD | `.github/workflows/*` | Replace unless customized |
| Docs | `AGENTS.md`, `README.md` | Merge |
| Skills | `.claude/skills/*` | Add new; update the template's own skills unless the user edited them (then merge) |
| Hooks | `.claude/hooks/*`, `.claude/settings.json` | Replace `hook.ts`; merge `rules.ts` and `settings.json` if the user added rules/permissions |

## Forks from before the single bundle

A fork older than template #5 builds one HTML per tool: `TOOL=<name>` in
`dev:web` / `build:web`, an `@tool/*` alias and a rename-to-`<tool>.html`
plugin in `vite.config.ts`, and resources reading `dist/client/<name>.html`.
Move it over: keep each page as `web/tools/<name>/index.tsx` (default export)
and register it in `TOOL_PAGES` in `web/router.tsx` (key = tool id); point
every resource at `dist/client/index.html`; drop the `TOOL=` scripts, the
alias (also in `tsconfig.json`) and the plugin. The `add-tool` skill is the
target shape.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Overwriting TOOL_PAGES in router.tsx | Merge: keep user's entries, adopt structural changes |
| Replacing package.json entirely | Merge deps/scripts separately |
| Losing user's resources in api/app.ts | Merge: preserve user's resource registrations |
| Not running `bun install` after dep changes | Always install before type-checking |
| Restoring files user intentionally deleted | Check git log for deletion before restoring |
