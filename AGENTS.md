# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start API server + web build (watch mode) concurrently
bun start            # `bun run dev` behind a deco tunnel (needs the deco CLI) — open it in deco Studio
bun run dev:api      # API server only (port 3001, hot reload)
bun run dev:web      # Web build only (watch mode)
bun run build        # Full production build (web + server)
bun run check        # TypeScript type checking (tsc --noEmit)
bun run ci:check     # Biome lint + format check (CI mode, no auto-fix)
bun run fmt          # Auto-format with Biome
bun run lint         # Auto-fix lint issues with Biome
bun test             # Run the app's tests (Bun skips .claude/)
bun test . ./.claude/hooks   # App tests + the hooks' tests (what CI runs)
bun test <file>      # Run a single test file
```

## Architecture

This is an **MCP App template** — it builds interactive UIs for MCP (Model Context Protocol) tools. A single unified HTML bundle is built and served as an MCP resource, with runtime routing to the correct tool UI based on the `toolName` from the MCP host context.

### Two-Layer Structure

**API Server (`api/`)** — Platform-agnostic MCP server using `@decocms/runtime`. Defines MCP tools, resources and prompts (`api/prompts/`), exposes them at `/api/mcp` (MCP Streamable HTTP).

**React UI (`web/`)** — React 19 app using `@modelcontextprotocol/ext-apps` SDK. Connects to the MCP host, receives tool input/results, and renders interactive UI.

### Multi-Platform Deployment

The API uses an **app factory** pattern for multi-platform deployment:

- **`api/app.ts`** — Platform-agnostic core. All business logic, middleware, tools, and resources live here. Exports a `{ fetch }` handler.
- **`api/main.bun.ts`** — Bun entrypoint (default, used for local dev). Calls `Bun.serve()` with the app's fetch handler.

To add a new deployment target, create a new `api/main.<platform>.ts` entrypoint — see the `add-deploy-target` skill.

### Tool Build Pipeline

All tool UIs live in `web/tools/<name>/`. Vite builds a single unified HTML file at `dist/client/index.html` (all CSS/JS inlined via `vite-plugin-singlefile`). At runtime, the `ToolRouter` component in `web/router.tsx` reads `toolName` from the MCP host context and renders the matching tool page from the `TOOL_PAGES` registry.

### Adding a New Tool

Full recipe: the `add-tool` skill.

1. Create `api/tools/<name>.ts` — tool definition with Zod input/output schemas, `_meta.ui.resourceUri` linking to the resource
2. Register in `api/tools/index.ts`
3. Create `api/resources/<name>.ts` — serves `dist/client/index.html` with MIME type `text/html;profile=mcp-app` — and add it to `resources` in `api/app.ts`
4. Create `web/tools/<name>/index.tsx` with the tool's page (default export)
5. Register the page in `TOOL_PAGES` in `web/router.tsx` (key must match the tool's `id`)

No build change: the bundle is shared. A page reads more data with `useToolQuery` / `useCallTool` (`web/lib/tools.ts`) and keeps view state in the route (`screens-and-tools`).

### MCP App Lifecycle (UI State Machine)

The UI renders based on `McpStatus`: `initializing` → `connected` → `tool-input` → `tool-result` (or `error` / `tool-cancelled`). See `web/types.ts` and `web/context.tsx`.

### Import Aliases

- `@/*` → `web/*` (components, hooks, lib). `api/` types are imported relatively (`../../../api/tools/<name>.ts`)

## Code Style

- **Runtime**: Bun (not Node) for local development
- **Formatter**: Biome with tab indentation, double quotes
- **Imports**: Must include `.ts`/`.tsx` extensions (`useImportExtensions: error`)
- **UI components**: shadcn/ui in `web/components/ui/` (do not lint these for a11y)
- **Styling**: Tailwind CSS v4, use `cn()` from `@/lib/utils.ts` for conditional classes; tokens and the design-system utilities (`surface`, `text-meta`, `tnum`, `focus-ring`…) are in `web/globals.css`
- **Dates**: `web/lib/format.ts`, never `toLocaleString` in a screen
- **Validation**: Zod v4 for all schemas (tool input/output, state)

## Skills and hooks

Skills in `.claude/skills/` say how each part of the app is built. UI and
design: `ui-components` (the UI kit in `web/components/ui`, recipes; its
`references/visual-identity.md` is the master rule), `studio-ui` (decocms
design system: hierarchy, tokens, what to cut), `screens-and-tools` (pages,
routes, reading/writing data, surviving a Studio reload), `saving`, `motion`,
`qa` (before a PR). Server and ops: `add-tool`, `add-deploy-target`,
`publish-store`, `migrate-template`.

Hooks (`.claude/hooks`, rules in `rules.ts`) enforce it: editing `web/**` is
refused until `ui-components` and `studio-ui` were loaded this session;
`web/router.tsx`, `web/context.tsx` and `web/tools/**` also need
`screens-and-tools`; `api/tools/**` and `api/resources/**` need `add-tool`.
Load them with the Skill tool (or read their SKILL.md) and retry; subagents
count what the main thread loaded before briefing them. Each request gets the
skills its words call for. `gh pr merge` is refused until the PR's checks
are green (skipped checks, or none at all, don't block). `.dev.vars`/`.env*`
can't be read, `--no-verify` and `git push --force` can't run. A hook that
breaks lets the call through. Test them with `bun test ./.claude/hooks`
(CI runs it).
