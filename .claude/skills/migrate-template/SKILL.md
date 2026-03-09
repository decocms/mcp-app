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
7. Verify: `bun install && bun run check && bun run ci:check && bun run build && bun test`

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
| 3 | **Framework Core** | `web/context.tsx`, `web/router.tsx`, `web/types.ts`, `web/app.tsx`, `api/main.ts`, `api/types/env.ts` |
| 4 | **UI Components** | `web/components/ui/*`, `web/lib/*`, `web/hooks/*`, CSS files (shadcn = usually safe to replace) |
| 5 | **Docs & Skills** | `CLAUDE.md`, `AGENTS.md`, `README.md`, `.claude/skills/**/*` |

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
bun install && bun run check && bun run ci:check && bun run build && bun test
```

If checks fail, dispatch a subagent to diagnose: template incompatibility, bad merge, or missing dep.

## File Categories Reference

| Category | Files | Strategy |
|----------|-------|----------|
| Infrastructure | `vite.config.ts`, `tsconfig.json`, `biome.json`, `index.html` | Replace |
| Build Scripts | `package.json` scripts | Merge (user adds TOOL= entries) |
| Dependencies | `package.json` deps/devDeps | Merge (keep user's, update template's) |
| Framework Core | `web/context.tsx`, `web/router.tsx`, `web/types.ts`, `web/app.tsx` | Merge carefully |
| Server Core | `api/main.ts`, `api/types/env.ts` | Merge carefully |
| UI Components | `web/components/ui/*`, `web/lib/*` | Replace (shadcn standard) |
| Example Tool | `api/tools/hello.ts`, `web/tools/hello/` | Skip if user deleted |
| User Tools | `api/tools/*`, `web/tools/*` (non-hello) | Never overwrite |
| CI/CD | `.github/workflows/*` | Replace unless customized |
| Docs | `CLAUDE.md`, `README.md` | Merge |
| Skills | `.claude/skills/*` | Add new, don't overwrite |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Overwriting TOOL_PAGES in router.tsx | Merge: keep user's entries, adopt structural changes |
| Replacing package.json entirely | Merge deps/scripts separately |
| Losing user's resources in api/main.ts | Merge: preserve user's resource registrations |
| Not running `bun install` after dep changes | Always install before type-checking |
| Restoring files user intentionally deleted | Check git log for deletion before restoring |
