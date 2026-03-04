# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start API server + web build (watch mode) concurrently
bun run dev:api      # API server only (port 3001, hot reload)
bun run dev:web      # Web build only (watch mode, requires TOOL env var)
bun run build        # Full production build (web + server)
bun run check        # TypeScript type checking (tsc --noEmit)
bun run ci:check     # Biome lint + format check (CI mode, no auto-fix)
bun run fmt          # Auto-format with Biome
bun run lint         # Auto-fix lint issues with Biome
bun test             # Run tests (Bun test runner)
bun test <file>      # Run a single test file
```

## Architecture

This is an **MCP App template** — it builds interactive UIs for MCP (Model Context Protocol) tools. Each tool gets a self-contained HTML bundle served as an MCP resource.

### Two-Layer Structure

**API Server (`api/`)** — Bun HTTP server using `@decocms/runtime`. Defines MCP tools and resources, exposes them at `/api/mcp` via SSE.

**React UI (`web/`)** — React 19 app using `@modelcontextprotocol/ext-apps` SDK. Connects to the MCP host, receives tool input/results, and renders interactive UI.

### Tool Build Pipeline

Each tool UI lives in `web/tools/<name>/`. The `TOOL` env var selects which folder Vite resolves via the `@tool/*` path alias. Vite builds it into a single self-contained HTML file at `dist/client/<name>.html` (all CSS/JS inlined via `vite-plugin-singlefile`).

```
TOOL=hello vite build
  → @tool/* resolves to web/tools/hello/*
  → outputs dist/client/hello.html
```

### Adding a New Tool

1. Create `api/tools/<name>.ts` — tool definition with Zod input/output schemas, `_meta.ui.resourceUri` linking to the resource
2. Register in `api/tools/index.ts`
3. Create `web/tools/<name>/` with `main.tsx`, `bridge.ts`, `context.tsx`, `router.tsx`, `types.ts`
4. Create `api/resources/<name>.ts` — serves `dist/client/<name>.html` with MIME type `text/html;profile=mcp-app`
5. Update `build:web` and `dev:web` scripts in `package.json` to include the new tool

### MCP App Lifecycle (UI State Machine)

The UI renders based on `McpStatus`: `initializing` → `connected` → `tool-input` → `tool-result` (or `error` / `tool-cancelled`). See `web/types.ts` and `web/context.tsx`.

### Import Aliases

- `@/*` → `web/*` (components, hooks, lib)
- `@tool/*` → `web/tools/<TOOL>/*` (current tool being built)

## Code Style

- **Runtime**: Bun (not Node)
- **Formatter**: Biome with tab indentation, double quotes
- **Imports**: Must include `.ts`/`.tsx` extensions (`useImportExtensions: error`)
- **UI components**: shadcn/ui in `web/components/ui/` (do not lint these for a11y)
- **Styling**: Tailwind CSS v4, use `cn()` from `@/lib/utils.ts` for conditional classes
- **Validation**: Zod v4 for all schemas (tool input/output, state)
