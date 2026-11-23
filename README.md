# MCP App Template

Official starter for building MCP Apps on deco — interactive UIs powered by the Model Context Protocol.

## Quick Start

```bash
# Clone the template
git clone https://github.com/decocms/mcp-app.git my-mcp-app
cd my-mcp-app

# Install dependencies
bun install

# Start development
bun run dev
```

## Project Structure

```
├── api/                        # MCP server (platform-agnostic)
│   ├── app.ts                  # App core — tools, resources, prompts, middleware
│   ├── main.bun.ts             # Bun entrypoint (local dev and build:server)
│   ├── tools/
│   │   ├── index.ts            # Tool registry
│   │   └── hello.ts            # Example tool (hello_world)
│   ├── resources/
│   │   └── hello.ts            # MCP App resource (serves dist/client/index.html)
│   ├── prompts/                # MCP prompts (hello)
│   └── types/
│       └── env.ts              # StateSchema + Env type
├── web/                        # React UI (one bundle for every tool)
│   ├── app.tsx                 # Entry: McpProvider, react-query, Toaster, router
│   ├── context.tsx             # MCP host connection: useMcpState, useMcpApp…
│   ├── router.tsx              # TOOL_PAGES + TanStack Router (route survives a Studio reload)
│   ├── types.ts                # McpStatus / McpState
│   ├── tools/
│   │   └── hello/index.tsx     # hello_world page
│   ├── components/ui/          # shadcn/ui components
│   ├── lib/                    # cn() (utils.ts), tools.ts (call tools), format.ts (dates)
│   ├── hooks/
│   └── globals.css             # Host tokens + design-system utilities (surface, text-meta…)
├── scripts/                    # start.ts (deco tunnel), dev-worktree.ts
├── .claude/                    # Skills and hooks for coding agents (see AGENTS.md)
├── index.html                  # Vite entry
├── vite.config.ts              # Single-file build → dist/client/index.html
├── components.json             # shadcn/ui config
└── app.json                    # App metadata (name, connection URL)
```

## Development

```bash
# Run API server + web build concurrently
bun run dev

# API server only (port 3001)
bun run dev:api

# Web build only (watch mode)
bun run dev:web
```

### Connecting to deco Studio

To test your MCP App in deco Studio, expose your local server through a tunnel:

```bash
bun start
# Tunnel started -> 🌐 Preview: https://<your-id>.deco.host
```

Then connect in Studio using the MCP URL:

```
https://<your-id>.deco.host/api/mcp
```

`bun start` runs `bun run dev` itself and needs the deco CLI (`deco link`).

### Adding a New Tool with UI

Every tool UI is a page in one shared bundle: Vite builds `dist/client/index.html`, and `web/router.tsx` renders the page registered in `TOOL_PAGES` for the tool the host called. No build change per tool.

1. **Create the tool** — `api/tools/my-tool.ts` using `createTool`, with `_meta.ui.resourceUri`
2. **Register it** — add to the `tools` array in `api/tools/index.ts`
3. **Create the resource** — `api/resources/my-tool.ts` serving `dist/client/index.html` under that URI; add it to `resources` in `api/app.ts`
4. **Create the page** — `web/tools/my-tool/index.tsx` (default export, reads `useMcpState()`)
5. **Register the page** — `TOOL_PAGES` in `web/router.tsx`, keyed by the tool's id

The [`add-tool` skill](.claude/skills/add-tool/SKILL.md) has the full recipe.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) (default), deployable to any Web Standard runtime
- **Server**: [@decocms/runtime](https://github.com/decocms/runtime) MCP server
- **UI**: React 19 + [TanStack Router](https://tanstack.com/router) (in memory; the route survives a reload in deco Studio via the `_route` arg) + [TanStack Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
- **MCP Apps**: [@modelcontextprotocol/ext-apps](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps) SDK
- **Build**: [Vite](https://vitejs.dev) + [vite-plugin-singlefile](https://github.com/nickreese/vite-plugin-singlefile)
- **Linting**: [Biome](https://biomejs.dev)

## How It Works

1. The **app core** (`api/app.ts`) defines tools, resources, and middleware as a platform-agnostic `fetch` handler
2. A **platform entrypoint** (`api/main.bun.ts`) starts the server using the platform's API
3. **Tools** perform actions and can link to a UI via `_meta.ui.resourceUri`
4. **Resources** serve the single-file HTML bundle with `mimeType: "text/html;profile=mcp-app"`
5. The **MCP App UI** connects to the host via `@modelcontextprotocol/ext-apps`, receives tool input/results, and renders an interactive display
6. Vite builds every page into one self-contained HTML file (CSS + JS inlined); at runtime the router picks the page by the tool's name

## Deployment

### Multi-Platform

The app uses a factory pattern that separates business logic (`api/app.ts`) from platform wiring. To deploy to a new platform, add a thin entrypoint file — see the [`add-deploy-target` skill](.claude/skills/add-deploy-target/SKILL.md) for step-by-step instructions.

Supported targets out of the box:
- **Bun** — `api/main.bun.ts` (default, used for local dev)

Easy to add (each runs a `bun build` bundle): **Node.js**, **Deno 2**, **Cloudflare Workers**, **AWS Lambda**.

### Publish to deco

deco Studio no longer accepts publish requests, so `.github/workflows/publish-registry.yml` runs only by hand; see the [`publish-store` skill](.claude/skills/publish-store/SKILL.md).

## CI

GitHub Actions runs on every push and pull request:

- `bun run ci:check` — Biome lint + format check
- `bun run check` — TypeScript type checking
- `bun run build` — Production build
- `bun test . ./.claude/hooks` — Unit tests and the agent hooks' tests
