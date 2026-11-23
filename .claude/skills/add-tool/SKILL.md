---
name: add-tool
description: Use when the user asks to add a new MCP tool, create a tool with UI, scaffold a tool, or add functionality to the MCP App server. Also use when adding API-only tools without a UI component.
---

# Adding a tool

A tool is always a server definition in `api/tools/`. A tool with a UI also
gets an MCP resource (`api/resources/`) and a page in `web/tools/`. There is
**one UI bundle** for every tool: `vite build` inlines all pages into
`dist/client/index.html`, and `web/router.tsx` picks the page by the tool's
name at runtime. Nothing in `package.json` or `vite.config.ts` changes per
tool.

## API-only or tool + UI?

- Simple action, nothing to look at (ping, toggle, delete): API only, steps 1–2.
- Returns something worth seeing (a list, a record, a chart, a form): steps 1–5.
- A tool only a screen calls (a page's extra read or a write): API only, steps
  1–2 — the screen calls it with `useToolQuery` / `useCallTool`
  (`web/lib/tools.ts`, skill `screens-and-tools`).

## Files

| Layer | File | |
|---|---|---|
| Tool | `api/tools/<name>.ts` | Zod input/output schemas, `execute`, `_meta.ui.resourceUri` if it has a UI |
| Tool registry | `api/tools/index.ts` | add to `tools` |
| Resource (UI only) | `api/resources/<name>.ts` | serves `dist/client/index.html` under the tool's URI |
| Resource registry (UI only) | `api/app.ts` | add to `resources` in `withRuntime` |
| Page (UI only) | `web/tools/<name>/index.tsx` | default export, every `McpStatus` |
| Page registry (UI only) | `web/router.tsx` | add to `TOOL_PAGES`, key = the tool's `id` |

| Naming | Convention | Example |
|---|---|---|
| Tool `id` | snake_case, verb first | `list_notes` |
| Files and folders | kebab-case | `api/tools/list-notes.ts`, `web/tools/list-notes/` |
| Resource URI | `ui://mcp-app/<kebab>` | `ui://mcp-app/list-notes` |
| Exports | camelCase | `listNotesTool`, `listNotesInputSchema` |

## 1. The tool — `api/tools/<name>.ts`

```ts
import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import type { Env } from "../types/env.ts";

// Only for a tool with a UI
export const LIST_NOTES_RESOURCE_URI = "ui://mcp-app/list-notes";

export const listNotesInputSchema = z.object({
	query: z.string().optional().describe("Text to search in the notes"),
});
export type ListNotesInput = z.infer<typeof listNotesInputSchema>;

export const listNotesOutputSchema = z.object({
	notes: z.array(z.object({ id: z.string(), title: z.string() })),
});
export type ListNotesOutput = z.infer<typeof listNotesOutputSchema>;

export const listNotesTool = (_env: Env) =>
	createTool({
		id: "list_notes",
		description: "Lists the notes, optionally filtered by a search text.",
		inputSchema: listNotesInputSchema,
		outputSchema: listNotesOutputSchema,
		_meta: { ui: { resourceUri: LIST_NOTES_RESOURCE_URI } }, // only with a UI
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		execute: async ({ context }) => {
			const { query } = context;
			return { notes: [{ id: "1", title: query ?? "First note" }] };
		},
	});
```

- Export the schemas **and** their inferred types; the page imports the types.
- `annotations` must be true to what the tool does (a write is
  `readOnlyHint: false`); hosts act on them.
- The description is for the model: what it does and when to call it.

## 2. Register the tool — `api/tools/index.ts`

```ts
import { helloTool } from "./hello.ts";
import { listNotesTool } from "./list-notes.ts";

export const tools = [helloTool, listNotesTool];
```

**API-only tools stop here.**

## 3. The resource — `api/resources/<name>.ts`

Same as `api/resources/hello.ts`, with this tool's URI. Every resource serves
the same bundle; the page is chosen at runtime by the tool's name.

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicResource } from "@decocms/runtime/tools";
import { LIST_NOTES_RESOURCE_URI } from "../tools/list-notes.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

// Two levels up from api/resources/ (dev) and dist/server/ (built) is the repo root.
const BUNDLE = join(import.meta.dirname, "../../dist/client/index.html");

export const listNotesAppResource = (_env: Env) =>
	createPublicResource({
		uri: LIST_NOTES_RESOURCE_URI,
		name: "Notes UI",
		description: "Interactive list of the notes",
		mimeType: RESOURCE_MIME_TYPE,
		read: async () => ({
			uri: LIST_NOTES_RESOURCE_URI,
			mimeType: RESOURCE_MIME_TYPE,
			text: await readFile(BUNDLE, "utf-8"),
		}),
	});
```

Then add it to `resources` in `api/app.ts`:

```ts
import { listNotesAppResource } from "./resources/list-notes.ts";
// …
	resources: [helloAppResource, listNotesAppResource],
```

## 4. The page — `web/tools/<name>/index.tsx`

Before writing it, load `ui-components`, `studio-ui` and `screens-and-tools`
(the hooks refuse edits in `web/` without them). `web/tools/hello` is the
reference page.

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useMcpState } from "@/context.tsx";
import type {
	ListNotesInput,
	ListNotesOutput,
} from "../../../api/tools/list-notes.ts";

export default function ListNotesPage() {
	const state = useMcpState<ListNotesInput, ListNotesOutput>();

	if (state.status === "error" || state.status === "tool-cancelled") {
		return (
			<Alert variant="destructive" className="m-6">
				<AlertTitle>Couldn't list the notes</AlertTitle>
				<AlertDescription>
					{state.error ?? "The call was cancelled."}
				</AlertDescription>
			</Alert>
		);
	}

	// Structure first: the frame draws now, the rows when the result lands.
	return (
		<div className="p-6">
			<h1 className="text-lg font-medium">Notes</h1>
			<ul className="surface mt-4 divide-y">
				{state.status === "tool-result" ? (
					state.toolResult?.notes.map((n) => (
						<li key={n.id} className="px-5 py-3 text-sm">
							{n.title}
						</li>
					))
				) : (
					<li className="px-5 py-3">
						<Skeleton className="h-4 w-1/2" />
					</li>
				)}
			</ul>
		</div>
	);
}
```

- Default export; type the state with the tool's exported types (a relative
  import from `api/`, there is no other alias for it).
- Handle every `McpStatus`: `initializing`, `connected`, `tool-input`,
  `tool-result`, `error`, `tool-cancelled`.

## 5. Register the page — `web/router.tsx`

```ts
import ListNotesPage from "./tools/list-notes/index.tsx";

const TOOL_PAGES: Record<string, React.ComponentType> = {
	hello_world: HelloPage,
	list_notes: ListNotesPage, // key = the tool's id
};
```

Tabs, drill-downs and filters inside the page live in the route, so a Studio
reload lands on the same view: `screens-and-tools`.

## 6. Check

```bash
bun run check && bun run ci:check && bun run build
```

Then call the tool from a host: `bun start` (runs `bun run dev` behind a
deco tunnel) and connect the MCP URL it prints in deco Studio (README).

## Common mistakes

| Mistake | Fix |
|---|---|
| Resource URI differs between tool and resource | Import the URI constant from the tool file |
| Resource not in `resources` in `api/app.ts` | The tool runs but its UI never opens |
| Page not in `TOOL_PAGES`, or keyed by file name | The UI shows "Unknown tool"; the key is the tool's `id` |
| Wrong MIME type | Exactly `text/html;profile=mcp-app` |
| Missing `.ts`/`.tsx` in an import | Biome's `useImportExtensions` fails CI |
| Adding a build step or `TOOL=` per tool | Not needed: one bundle, routed at runtime |
| Only some `McpStatus` handled | The page breaks on cancel, error or before the result |
