---
name: add-deploy-target
description: Use when the user asks to add support for a new deployment target or platform (e.g., Cloudflare Workers, Deno, Node.js, AWS Lambda), create a new entrypoint, or make the app deployable to a specific environment.
---

# Adding a Deployment Target

## Overview

All business logic lives in `api/app.ts`, which exports `app = { fetch }` (a
plain fetch handler, not a Hono app). Each target gets a thin entrypoint,
`api/main.<platform>.ts`. `api/main.bun.ts` is the default (local dev and
`bun run build:server`).

**`api/app.ts` never imports platform APIs.** Platform code goes in the
entrypoint.

Two facts shape every target:

1. **Bundle first.** `@decocms/runtime` ships raw `.ts` in `node_modules`,
   which Node and Deno refuse to strip. Every non-Bun target runs a
   `bun build` output, not the source.
2. **The UI is a file.** The resources (`api/resources/*.ts`) read
   `dist/client/index.html` with `readFile` from
   `import.meta.dirname/../..`, so `bun run build:web` runs first and the
   deployed package keeps `dist/client/index.html` next to `dist/server/`.
   Workers have no filesystem: see Workers.

## Node.js (verified on Node 24)

```bash
bun add @hono/node-server
```

```ts
// api/main.node.ts
import { serve } from "@hono/node-server";
import { app } from "./app.ts";

const PORT = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port: PORT });

console.log(`\nMCP App: http://localhost:${PORT}/api/mcp\n`);
```

```json
"build:node": "bun run build:web && NODE_ENV=production bun build api/main.node.ts --target=node --minify --outfile=dist/server/main.node.js",
"start:node": "node dist/server/main.node.js"
```

`node --experimental-strip-types api/main.node.ts` does **not** work
(`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on the runtime's `.ts`).

## Deno (verified on Deno 2; 1.x fails)

No `Deno` global, so `bun run check` passes as is:

```ts
// api/main.deno.ts
import { app } from "./app.ts";

export default { fetch: app.fetch };
```

```json
"build:deno": "bun run build:web && NODE_ENV=production bun build api/main.deno.ts --target=node --minify --outfile=dist/server/main.deno.js",
"start:deno": "deno serve --allow-net --allow-env --allow-read dist/server/main.deno.js"
```

Deno 1.x fails at request time (`process is not defined`); running the
source fails like Node. `deno serve` takes `--port`.

## Cloudflare Workers (verified with `wrangler dev` and a dry-run deploy)

```bash
bun add -d wrangler
```

The entrypoint is the same as Deno's:

```ts
// api/main.workers.ts
import { app } from "./app.ts";

export default { fetch: app.fetch };
```

```toml
# wrangler.toml
name = "mcp-app"
main = "api/main.workers.ts"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "bun run build:web"
```

```json
"dev:workers": "wrangler dev",
"deploy:workers": "wrangler deploy"
```

**The resources must import the HTML instead of reading it** (on Workers
`import.meta.dirname` is undefined and there is no disk). Wrangler bundles a
text import with no extra `rules`:

```ts
// api/resources/<name>.ts — replace the readFile/BUNDLE lines with:
import html from "../../dist/client/index.html" with { type: "text" };
// …
		read: async () => ({
			uri: HELLO_RESOURCE_URI,
			mimeType: RESOURCE_MIME_TYPE,
			text: String(html), // String(): bun-types types *.html as an HTMLBundle
		}),
```

This also works under Bun and Node, but the import needs
`dist/client/index.html` to exist when the server starts: on a fresh clone
`bun run dev` starts the API before Vite's first build and the API doesn't
recover. With the text import, make `dev` build first:
`"dev": "bun run build:web && concurrently …"`. Keep `readFile` (the
template default) when Workers isn't a target.

## AWS Lambda (typechecked and invoked locally; not deployed)

```bash
bun add hono
```

`handle()` wants a Hono app, and `app` is a plain fetch handler: mount it.

```ts
// api/main.lambda.ts
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { app } from "./app.ts";

export const handler = handle(new Hono().mount("/", app.fetch));
```

```json
"build:lambda": "bun run build:web && NODE_ENV=production bun build api/main.lambda.ts --target=node --minify --outfile=dist/server/main.lambda.js"
```

Ship `dist/server/main.lambda.js` with `dist/client/index.html` (or use the
text import above, which puts the HTML inside the bundle). The adapter
buffers responses, which is fine for these JSON-RPC calls. Infrastructure
(SAM, CDK, Terraform) is the user's choice — ask.

## Verify

1. `bun run check` (tsc covers `api/**`, so the new entrypoint is checked).
2. Build and start the target, then call the MCP endpoint and read the UI:
   ```bash
   U=http://localhost:3001/api/mcp
   H='-H Content-Type:application/json -H Accept:application/json,text/event-stream'
   curl -s $H $U -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'
   curl -s $H $U -d '{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"ui://mcp-app/hello"}}'
   ```
   The second answer carries the HTML.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Platform code in `api/app.ts` | It goes in `main.<platform>.ts` only |
| Running the `.ts` source on Node or Deno | Bundle with `bun build --target=node` and run the output |
| Shipping the server without `dist/client/index.html` | The UI resource fails to read; ship it, or use the text import |
| `readFile` on Workers | Text import of `dist/client/index.html` |
| `handle(app)` for Lambda | `handle(new Hono().mount("/", app.fetch))` |
| Forgetting `nodejs_compat` on Workers | Required for the runtime's `node:` imports |
