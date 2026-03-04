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
├── api/                        # MCP server (Bun)
│   ├── main.ts                 # Server entry point with middleware
│   ├── tools/
│   │   ├── index.ts            # Tool registry
│   │   └── hello.ts            # Example tool (hello_world)
│   ├── resources/
│   │   └── hello.ts            # MCP App resource (serves HTML)
│   └── types/
│       └── env.ts              # StateSchema + Env type
├── web/                        # React UI (MCP App)
│   ├── tools/                  # One folder per tool UI (folder-based routing)
│   │   └── hello/              # hello_world tool UI
│   │       ├── main.tsx        # React entry point
│   │       ├── bridge.ts       # MCP App SDK integration
│   │       ├── context.tsx     # React context for MCP state
│   │       ├── router.tsx      # TanStack Router with UI
│   │       └── types.ts        # UI state types
│   ├── entry.tsx               # Build entry (imports @tool/main.tsx)
│   ├── components/ui/          # shadcn/ui components
│   ├── lib/utils.ts            # cn() helper
│   └── globals.css             # Tailwind base styles
├── index.html                  # Single Vite entry (shared by all tools)
├── package.json
├── tsconfig.json
├── biome.json
├── vite.config.ts
├── components.json             # shadcn/ui config
├── app.json                    # Deco mesh config
└── .mcp.json                   # Local MCP server config
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

### Adding a New Tool with UI

Each tool UI lives in `web/tools/<name>/`. The `TOOL` env var tells Vite which folder to build — one build per tool, output as `dist/client/<name>.html`.

1. **Create the tool** — `api/tools/my-tool.ts` using `createTool`
2. **Register it** — add to the `tools` array in `api/tools/index.ts`
3. **Create the UI** — `web/tools/my-tool/` with `main.tsx`, `bridge.ts`, `context.tsx`, `router.tsx`, `types.ts`
4. **Create the resource** — `api/resources/my-tool.ts` serving `dist/client/my-tool.html`
5. **Update build scripts**:
   ```json
   "build:web": "TOOL=hello vite build && TOOL=my-tool vite build",
   "dev:web": "concurrently \"TOOL=hello vite build --watch\" \"TOOL=my-tool vite build --watch\""
   ```

### How the Tool Router Works

```
TOOL=hello vite build
  → resolves @tool/* → web/tools/hello/*
  → index.html imports web/entry.tsx imports @tool/main.tsx
  → outputs dist/client/hello.html (single-file bundle)
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Server**: [@decocms/runtime](https://github.com/decocms/runtime) MCP server
- **UI**: React 19 + [TanStack Router](https://tanstack.com/router) (hash-based) + [TanStack Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
- **MCP Apps**: [@modelcontextprotocol/ext-apps](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps) SDK
- **Build**: [Vite](https://vitejs.dev) + [vite-plugin-singlefile](https://github.com/nickreese/vite-plugin-singlefile)
- **Linting**: [Biome](https://biomejs.dev)

## How It Works

1. The **MCP server** (`api/main.ts`) exposes tools and resources over the MCP protocol
2. **Tools** perform actions and can link to a UI via `_meta.ui.resourceUri`
3. **Resources** serve single-file HTML bundles with `mimeType: "text/html;profile=mcp-app"`
4. The **MCP App UI** connects to the host via `@modelcontextprotocol/ext-apps`, receives tool input/results, and renders an interactive display
5. Vite builds each tool UI into a self-contained HTML file (CSS + JS inlined) using the `TOOL` env var to select which `web/tools/<name>/` folder to bundle

## Deployment

Publish to the deco mesh:

1. Update `app.json` with your app's name, description, and connection URL
2. Push to your repository — CI will validate the build
3. Follow deco mesh publishing instructions to deploy

## CI

GitHub Actions runs on every push and pull request:

- `bun run ci:check` — Biome lint + format check
- `bun run check` — TypeScript type checking
- `bun test` — Unit tests
- `bun run build` — Production build
