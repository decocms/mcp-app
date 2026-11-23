---
name: screens-and-tools
description: How to add or change a screen (a tool's page), a route inside it (a tab, a drill-down) in this MCP App, how a screen reads and writes data (useMcpState, app.callServerTool, react-query) and keeps its place across a Studio reload (the `_route` round-trip in web/router.tsx) — plus what a tool needs so a screen can call it. Load before touching web/router.tsx, web/context.tsx, web/tools/ or adding a screen.
paths:
  - "web/router.tsx"
  - "web/context.tsx"
  - "web/tools/**"
---

# Tools and screens

How it works: **one HTML bundle** (`dist/client/index.html`, every tool's UI
inlined) served as the MCP App resource. The host calls a tool whose
`_meta.ui.resourceUri` points at it; the bundle connects, reads the tool's
name from the host context, and renders that tool's page.

```
Host → tool (_meta.ui.resourceUri) → bundle → web/app.tsx (McpProvider)
  → AppRouter (web/router.tsx, TanStack Router on a memory history)
  → ToolRouter → TOOL_PAGES[toolName] → web/tools/<name>/index.tsx
  → the page reads useMcpState() and calls more tools (app.callServerTool)
```

Code: `web/context.tsx` (`McpProvider`, `useMcpState`, `useMcpApp`,
`useMcpHostContext`, `useTheme`), `web/types.ts` (`McpStatus`),
`web/router.tsx` (`TOOL_PAGES`, routes, the Studio reload round-trip),
`web/lib/tools.ts` (`useToolQuery`, `useCallTool`: calling tools from a
screen; `web/app.tsx` mounts react-query's `QueryClientProvider` and the
`Toaster`).

## 1. A tool a screen calls

The server side is the `add-tool` skill (`api/tools/<name>.ts`, registered in
`api/tools/index.ts`; a resource in `api/resources/` only for a tool that
opens a UI). For a screen:

- Zod v4 input **and** output schema; snake_case id, verb first
  (`list_items`, `get_item`); `annotations` with `readOnlyHint`. Export the
  inferred types — the UI imports them (`../../../api/tools/<name>.ts`).
- Who is calling comes from the request (the runtime's auth/state), never
  from an argument the client sets.
- Writes have `readOnlyHint: false` and return what the screen needs to
  re-render.
- **Fail small.** A tool fails only when its *primary* data fails.
  Enrichment (names, photos, a count from another source) is best effort:
  catch it, log the reason, and return the rows with those fields `null`.
- A tool only the UI calls (not the model) still needs a clear description —
  the model sees every tool.

## 2. A screen for a tool

1. A page component, default export, in `web/tools/<name>/index.tsx`,
   handling every status (`web/tools/hello` is the reference):
   ```tsx
   export default function ItemsPage() {
   	const state = useMcpState<ListItemsInput, ListItemsOutput>();
   	if (state.status === "error" || state.status === "tool-cancelled")
   		return <Alert variant="destructive">…{state.error}</Alert>;
   	// the frame now; <Skeleton /> rows until state.status === "tool-result"
   	…
   }
   ```
   Structure first: once the tool is known, draw the real frame and
   skeleton rows, not a centered spinner (`ui-components`).
2. Register it in `TOOL_PAGES` in `web/router.tsx` (key = the tool's `id`).
3. Check it in Studio: `bun start` (it runs `bun run dev` behind a tunnel),
   connect the MCP URL it prints, call the tool.

Data inside a screen:

| Need | Use |
|---|---|
| The input/result of the tool that opened it | `useMcpState<Input, Output>()` |
| Read extra data (a panel, a block) | `useToolQuery<Output>("get_item", { id })` from `web/lib/tools.ts` (react-query, keyed by name + args; `data` / `isPending` / `error` / `refetch`) — never a `useEffect` + `useState` per screen, never `callServerTool` by hand |
| Write, then refresh what's on screen | `const call = useCallTool()` → `await call("archive_item", { id })` (throws the tool's error), then `queryClient.invalidateQueries({ queryKey: ["list_items"] })` (`useQueryClient()`). In a control: skill `saving` |
| Another view of the same tool (tab, filter, selected row, open panel) | a search param — see below |
| A drill-down with its own path (`/items/$id`) | a route in `web/router.tsx` next to `indexRoute` + `<Link>` / `useNavigate()`. Routes are shared by every tool's page (one router), so prefix them with the tool (`/notes/$id`) |
| View state that survives a reload | the route (path or search) — never `useState` |
| The host (open a link, theme, safe area, display mode) | `useMcpApp()` (`openLink`, `sendMessage`, `updateModelContext`), `useMcpHostContext()`, `useTheme()` |

**View state in the search params.** The page route (`/`) is shared by every
tool, so a page doesn't declare `validateSearch` on it; it parses its own
params with Zod (`.catch` = the default, so a bad or missing param can't
break the page) and writes them with `navigate`:

```tsx
import { useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";

const View = z.object({ tab: z.enum(["all", "starred"]).catch("all") });

const { tab } = View.parse(useSearch({ strict: false }));
const navigate = useNavigate();
const setTab = (tab: "all" | "starred") =>
	navigate({ to: ".", search: (s: Record<string, unknown>) => ({ ...s, tab }) });
```

**A Studio reload lands where you were.** Every navigation after the first
is reported to Studio as `studio://navigate?args={"_route":"<href>"}`; on
reload Studio calls the tool again with `_route` in its input and
`AppRouter` replays it (`history.replace`). So whatever must survive goes in
the route — path and search params — and nothing else. Don't build a second
mechanism. Outside Studio (other hosts) the route still works, it just
starts at `/`.

## 3. A new tool with its own UI

Server: the tool with `_meta: { ui: { resourceUri } }` and its resource
(`add-tool`). Client: its page in `TOOL_PAGES`. The bundle is shared, so
there is nothing to add to the build.

## 4. Done

- [ ] Tool has input/output schemas, description, annotations; its types are
      exported and imported by the UI, no `any`.
- [ ] Page registered in `TOOL_PAGES` (key = tool id); every `McpStatus`
      handled, plus the states of its own reads (`ui-components`).
- [ ] View state in the route; a reload in Studio lands on the same screen
      with the same tab/filter.
- [ ] Reads go through the shared hook, not ad-hoc effects.
- [ ] `qa` before the PR.
