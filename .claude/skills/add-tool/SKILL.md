---
name: add-tool
description: Use when the user asks to add a new MCP tool, create a tool with UI, scaffold a tool, or add functionality to the MCP App server. Also use when adding API-only tools without a UI component.
---

# Adding Tools to MCP App

## Overview

Each MCP tool in this project has up to 3 layers: an **API tool** (required), an **MCP resource** (if UI), and a **React UI** (if UI). Tools without UI only need the API layer.

## When to Use

- User asks to "add a tool", "create a new tool", "scaffold a tool"
- User wants to add interactive UI to an existing tool
- User needs a new MCP capability with or without visual output

## Decision: API-Only vs Tool+UI

```
Does the tool need a visual/interactive UI?
  YES → Create all 3 layers (API tool + resource + web UI)
  NO  → Create API tool only (steps 1-2)
```

**Always suggest adding a UI** when the tool returns data that benefits from visual presentation (lists, charts, forms, structured data, interactive elements). API-only is appropriate for simple actions (toggle, delete, ping).

## Quick Reference

| Layer | File | Purpose |
|-------|------|---------|
| Tool definition | `api/tools/<name>.ts` | Zod schemas, execute logic, resource URI link |
| Tool registry | `api/tools/index.ts` | Add tool to exports array |
| Resource | `api/resources/<name>.ts` | Serve `dist/client/<name>.html` as MCP resource |
| Resource registry | `api/main.ts` | Add resource to `withRuntime` resources array |
| Web UI | `web/tools/<name>/index.tsx` | React component rendering tool states |
| Build scripts | `package.json` | Add `TOOL=<name>` to `build:web` and `dev:web` |

## Naming Conventions

| Aspect | Convention | Example |
|--------|-----------|---------|
| Tool ID | snake_case | `search_users` |
| File names | kebab-case | `search-users.ts` |
| Resource URI | `ui://mcp-app/<kebab>` | `ui://mcp-app/search-users` |
| Export names | camelCase | `searchUsersTool`, `searchUsersInputSchema` |
| Build output | `dist/client/<kebab>.html` | `dist/client/search-users.html` |

## Step 1: Create Tool Definition

Create `api/tools/<name>.ts`:

```typescript
import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import type { Env } from "../types/env.ts";

// Only include if tool has UI
export const MY_TOOL_RESOURCE_URI = "ui://mcp-app/my-tool";

export const myToolInputSchema = z.object({
	query: z.string().describe("Search query"),
});
export type MyToolInput = z.infer<typeof myToolInputSchema>;

export const myToolOutputSchema = z.object({
	results: z.array(z.string()),
});
export type MyToolOutput = z.infer<typeof myToolOutputSchema>;

export const myTool = (_env: Env) =>
	createTool({
		id: "my_tool",
		description: "What this tool does and when to use it",
		inputSchema: myToolInputSchema,
		outputSchema: myToolOutputSchema,
		// Only include _meta if tool has UI
		_meta: { ui: { resourceUri: MY_TOOL_RESOURCE_URI } },
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		execute: async ({ context }) => {
			const { query } = context;
			return { results: [`Result for ${query}`] };
		},
	});
```

**Key points:**
- Export input/output schemas AND their inferred types (UI needs them)
- `_meta.ui.resourceUri` links tool to its UI resource (omit for API-only tools)
- Set `annotations` accurately — they affect how MCP clients handle the tool

## Step 2: Register Tool

Add to `api/tools/index.ts`:

```typescript
import { myTool } from "./my-tool.ts";

export const tools = [helloTool, myTool];
```

**Stop here for API-only tools.** Continue for tools with UI.

## Step 3: Create Resource

Create `api/resources/<name>.ts`:

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicResource } from "@decocms/runtime/tools";
import { MY_TOOL_RESOURCE_URI } from "../tools/my-tool.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

function getDistPath(): string {
	const IS_PRODUCTION = process.env.NODE_ENV === "production";
	const projectRoot = join(import.meta.dir, IS_PRODUCTION ? "../.." : "../..");
	return join(projectRoot, "dist", "client", "my-tool.html");
}

export const myToolAppResource = (_env: Env) =>
	createPublicResource({
		uri: MY_TOOL_RESOURCE_URI,
		name: "My Tool UI",
		description: "Interactive UI for my tool",
		mimeType: RESOURCE_MIME_TYPE,
		read: async () => {
			const html = await readFile(getDistPath(), "utf-8");
			return {
				uri: MY_TOOL_RESOURCE_URI,
				mimeType: RESOURCE_MIME_TYPE,
				text: html,
			};
		},
	});
```

**Critical:** MIME type MUST be `"text/html;profile=mcp-app"`.

## Step 4: Register Resource

In `api/main.ts`, import and add to the resources array:

```typescript
import { myToolAppResource } from "./resources/my-tool.ts";

const runtime = withRuntime<Env, typeof StateSchema>({
	configuration: { state: StateSchema },
	tools,
	resources: [helloAppResource, myToolAppResource],
});
```

## Step 5: Create Web UI

Create `web/tools/<name>/index.tsx`:

```typescript
import { useMcpState } from "@/context.tsx";
import type { MyToolInput, MyToolOutput } from "../../../api/tools/my-tool.ts";

export default function MyToolPage() {
	const state = useMcpState<MyToolInput, MyToolOutput>();

	if (state.status === "initializing") {
		return <div>Connecting to host...</div>;
	}

	if (state.status === "connected") {
		return <div>Waiting for tool call...</div>;
	}

	if (state.status === "error") {
		return <div>Error: {state.error}</div>;
	}

	if (state.status === "tool-cancelled") {
		return <div>Cancelled</div>;
	}

	if (state.status === "tool-input") {
		return <div>Processing {JSON.stringify(state.toolInput)}...</div>;
	}

	// tool-result
	return <div>{JSON.stringify(state.toolResult)}</div>;
}
```

**Key patterns:**
- Default export is required (imported via `@tool/index.tsx` alias)
- `useMcpState<Input, Output>()` provides typed state
- Handle all 6 statuses: `initializing`, `connected`, `tool-input`, `tool-result`, `error`, `tool-cancelled`
- Import types from `../../../api/tools/<name>.ts` (relative path from web/tools)
- Use shadcn/ui components from `@/components/ui/` for consistent styling

## Step 6: Update Build Scripts

In `package.json`, add `TOOL=<name>` to both scripts:

```json
{
	"dev:web": "concurrently \"TOOL=hello vite build --watch\" \"TOOL=my-tool vite build --watch\"",
	"build:web": "TOOL=hello vite build && TOOL=my-tool vite build"
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Resource URI mismatch between tool and resource | Copy URI constant from tool file, don't redefine |
| Missing `.ts`/`.tsx` in imports | Biome enforces `useImportExtensions: error` |
| Wrong MIME type on resource | Must be `"text/html;profile=mcp-app"` exactly |
| Forgetting to register resource in `api/main.ts` | Tool works but UI never loads |
| Not updating both `dev:web` and `build:web` | Dev works but production build misses the tool |
| Using `@tool/` imports in API code | `@tool/` alias only works in web builds |
| Not handling all 6 MCP statuses | UI breaks on cancel, error, or initial states |
