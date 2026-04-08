---
name: add-deploy-target
description: Use when the user asks to add support for a new deployment target or platform (e.g., Cloudflare Workers, Deno, Node.js, AWS Lambda), create a new entrypoint, or make the app deployable to a specific environment.
---

# Adding a Deployment Target

## Overview

This MCP App uses a **platform-agnostic app factory** pattern. All business logic lives in `api/app.ts`, which exports a `fetch` handler. Each deployment target gets a thin entrypoint file (`api/main.<platform>.ts`) that starts the server using that platform's API.

## When to Use

- User asks to "add Workers support", "deploy to Deno", "add Lambda entrypoint"
- User wants to deploy the app to a new platform
- User asks to add a `wrangler.toml`, `Dockerfile`, or platform config

## Architecture

```
api/
├── app.ts              # Platform-agnostic core (DO NOT put platform code here)
├── main.bun.ts         # Bun entrypoint (default, used for local dev)
├── main.workers.ts     # Cloudflare Workers entrypoint (if added)
├── main.deno.ts        # Deno entrypoint (if added)
├── main.node.ts        # Node.js entrypoint (if added)
└── main.lambda.ts      # AWS Lambda entrypoint (if added)
```

**Key rule:** `api/app.ts` must never import platform-specific APIs. All platform specifics go in the entrypoint.

## Step 1: Create the Entrypoint

Create `api/main.<platform>.ts`. The entrypoint imports `app` from `./app.ts` and starts the server.

### Cloudflare Workers

```typescript
// api/main.workers.ts
import { app } from "./app.ts";

export default { fetch: app.fetch };
```

### Deno

```typescript
// api/main.deno.ts
import { app } from "./app.ts";

const PORT = Number(Deno.env.get("PORT")) || 3001;
Deno.serve({ port: PORT }, app.fetch);

console.log(`\nMCP App: http://localhost:${PORT}/api/mcp\n`);
```

### Node.js

```typescript
// api/main.node.ts
import { serve } from "@hono/node-server";
import { app } from "./app.ts";

const PORT = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port: PORT });

console.log(`\nMCP App: http://localhost:${PORT}/api/mcp\n`);
```

**Requires dependency:** `bun add @hono/node-server`

### AWS Lambda

```typescript
// api/main.lambda.ts
import { handle } from "hono/aws-lambda";
import { app } from "./app.ts";

export const handler = handle(app);
```

**Requires dependency:** `bun add hono` (for `hono/aws-lambda` adapter)

## Step 2: Add Platform Config (if needed)

### Cloudflare Workers — `wrangler.toml`

```toml
name = "mcp-app"
main = "api/main.workers.ts"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "bun run build:web"

[observability]
enabled = true
```

**Add `wrangler` as a dev dependency:**
```bash
bun add -d wrangler
```

### AWS Lambda

Requires a bundling step (e.g., esbuild or `bun build --target=node`) and an infrastructure config (SAM template, CDK, or Terraform). Ask the user which IaC tool they prefer.

### Deno

No config file needed. Optionally add a `deno.json` for import maps if the project uses npm packages:

```json
{
  "imports": {
    "@decocms/runtime": "npm:@decocms/runtime"
  }
}
```

## Step 3: Add Package Scripts

Add dev and deploy scripts for the new target in `package.json`:

### Cloudflare Workers

```json
{
  "dev:workers": "bun run build:web && wrangler dev",
  "deploy": "bun run build:web && wrangler deploy"
}
```

### Deno

```json
{
  "dev:deno": "deno run --allow-net --allow-env --allow-read api/main.deno.ts"
}
```

### Node.js

```json
{
  "dev:node": "node --experimental-strip-types api/main.node.ts"
}
```

## Step 4: Verify

1. Run the new dev script and confirm the server starts
2. Test the MCP endpoint: `curl http://localhost:3001/api/mcp`
3. Run `bun run check` to ensure TypeScript is happy

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Adding platform-specific code to `api/app.ts` | Keep `app.ts` agnostic — platform code goes in `main.<platform>.ts` only |
| Forgetting `nodejs_compat` flag for Workers | Required for `node:` imports used by the runtime |
| Not building web assets before Workers deploy | `wrangler.toml` build command should run `bun run build:web` |
| Using `process.env` in Deno entrypoint | Use `Deno.env.get()` instead |

## Reference: Existing Entrypoint

The Bun entrypoint (`api/main.bun.ts`) is the reference implementation:

```typescript
import { app } from "./app.ts";

const PORT = Number(process.env.PORT) || 3001;

Bun.serve({
  idleTimeout: 0,
  hostname: "0.0.0.0",
  port: PORT,
  fetch: app.fetch,
});

const slug = process.env.WORKTREE_SLUG;
const baseUrl = slug ? `http://${slug}.localhost` : `http://localhost:${PORT}`;

console.log("");
console.log(`MCP App: ${baseUrl}/api/mcp`);
console.log("");
```
