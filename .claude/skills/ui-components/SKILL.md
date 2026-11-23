---
name: ui-components
description: How to build any screen, list, form or component in this MCP App — reuse the UI kit in web/components/ui (shadcn), where a new component goes, how components compose (slots, render props, variants, nesting), and the mandatory recipes (page states, lists, dialogs, links, view state that survives a Studio reload). Load before touching web/.
paths:
  - "web/**"
---

# Building UI here

> **Master rule: [references/visual-identity.md](references/visual-identity.md).**
> Every screen of the app reads as one product: title row exclusive, tables
> capped and scrolling inside, `—` for zero, no uppercase, tokens only,
> structure-first loading. Read it before any UI change; where it and
> `studio-ui` disagree, it wins.

Design decisions (hierarchy, density, tokens, what to cut) come from the
`studio-ui` skill. Components here are the template's own UI kit — shadcn/ui
in `web/components/ui/`, styled by the host's tokens in `web/globals.css` —
not `@decocms/ui`.

Where this skill names a piece the template doesn't have yet (a filter row,
a page frame, `useSubmit`, motion recipes), **build it once in the UI kit**
(`web/components/` or `web/lib/`) the first time a screen needs it — never
hand-roll a second version inside a screen.

## 0. Plan the screen before the first edit

**Look at the screen first.** `bun run dev` builds the bundle in watch mode
and serves the MCP server on :3001; `bun start` tunnels it so deco Studio
can open it (README, "Connecting to deco Studio"). Screenshot the real
screen with real data. Plans written from JSX alone miss what the eye lands
on.

Creating a screen or changing its layout? Write the **screen plan** first —
in your reply (before building) and in the PR. Five lines and a sketch:

1. **The job** — what the person comes here to do, in one sentence. That
   region leads; everything else steps down (`studio-ui`).
2. **Regions** — main / aside / what stays visible while scrolling, as an
   ASCII sketch. Reference material is an aside that stays put
   (`lg:sticky lg:top-4`), not a block on top that scrolls away.
3. **Width** — use it: a narrow column centered on a wide window is the most
   common complaint. A main + aside grid
   (`lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]`) puts the second region
   beside the first instead of below.
4. **States** — the MCP statuses (`initializing`, `connected`, `tool-input`,
   `tool-result`, `error`, `tool-cancelled`), plus empty, loading, failed and
   saving for every read inside the screen.
5. **Reuse** — which `web/components/ui` pieces carry it.

## 1. Look before you write

1. Open the kit: `web/components/ui/` (shadcn primitives: `button`, `card`,
   `table`, `empty`, `skeleton`, `spinner`, `alert-dialog`, `sonner`,
   `field`, `item`…), `web/components/` (the app's own shared pieces),
   `web/lib/utils.ts` (`cn`), `web/hooks/`.
2. Something close exists → use it. It's missing one behaviour → **add a prop
   to the shared component** (default = today's behaviour). Never copy it
   into a screen, never fork it "just for this screen".
3. Grep for the visual you need (`rg "rounded-xl border" web`) — it's often
   already solved in another screen. Then extract, don't duplicate.

## 2. Where a new component goes

| It is… | Put it in |
|---|---|
| A shadcn primitive | `web/components/ui/<name>.tsx` (`bunx shadcn@latest add <name>`; `components.json` points there) |
| Generic: no tool names, no domain types (a picker, a badge, a formatter, a page frame) | `web/components/<name>.tsx` (or `web/lib/` for a non-visual helper) |
| Navigation, view state, tool calls (no domain) | `web/router.tsx` / `web/context.tsx` (`screens-and-tools`) |
| This app's domain, used by several screens | `web/components/<domain>/` |
| Used by one screen only | that screen's folder, `web/tools/<name>/` |

Promote (screen folder → `web/components`) the moment a second screen needs
it, in the same change. Imports use the `@/` alias with the extension:
`@/components/ui/button.tsx`.

**`web/components` never calls tools** — data in by props, events out by
callbacks. Screens call tools (`screens-and-tools`).

## 3. Composition

Prefer, in this order:

1. **Slots (`ReactNode` props)** for "something goes here": a page frame's
   `title`, `meta`, `actions`; an error block's `action`.
2. **Variant props** for "the same thing, a bit different" (`cva`, as the
   shadcn components do). A boolean per caller is a smell — name the variant.
3. **Render props** when the parent owns the data and the caller owns the row.
4. **Context** when a deep block needs something the screen provides.
5. **Nesting**: a page is made of blocks, each reading its own data. Export
   the pieces so other screens can reuse them.

Keep components dumb about where they are: no `if (toolName === …)`, no
reading the route. Take what you need as props.

## 4. Mandatory recipes

| Need | Use |
|---|---|
| Page frame | One shared `Page` (title, meta, actions) in `web/components/` — build it with the first screen that has a title row, then every screen uses it |
| Loading / error / empty | `Skeleton` / `Spinner` for loading, `Empty` (`components/ui/empty.tsx`) for nothing-to-show, `Alert variant="destructive"` with a retry action for failures — never a bare "Loading…" |
| A failure stays in its block | The page shows its error only when **its own** tool fails. A block's extra read that fails shows its error in the block — never a skeleton forever, never the page's error |
| A list | Search over the rows (accent/case-insensitive), sortable headers, server paging with `Pagination`. Filter/sort/search state in the route (see below). One filter row on the right — not a row of selects |
| A destructive confirm | `AlertDialog` — never `window.confirm` (the host sandbox swallows it) |
| Dates and durations | one formatter module in `web/lib/` (`Intl.DateTimeFormat` / `date-fns`, already a dependency) — never `toLocaleString` ad hoc in a screen |
| Anything that saves | skill `saving` |
| Animation | skill `motion` |
| View state that survives a reload (a tab, a filter, a search, an open panel) | the route — a path or search param of the TanStack Router in `web/router.tsx`, never `useState` (see below) |
| Open a link | through the host: `useMcpApp()?.openLink({ url })`; `window.open` lands on a blank page in Studio |
| Talk to the chat | `app.sendMessage(…)` / `app.updateModelContext(…)` (see `web/tools/hello`) |
| Classes | Tailwind v4 + `cn()` (`@/lib/utils.ts`); colours only through the tokens in `web/globals.css` (they map the host's CSS variables) |

**A reload lands where you were.** `web/router.tsx` runs TanStack Router on a
memory history; inside Studio every navigation is reported to the host
(`studio://navigate` with `_route`), and on reload the host hands `_route`
back in the tool input, which the router replays. So anything in the route
(path + search) survives a Studio reload; anything in `useState` does not.

## 5. Re-reading: keep what's on screen, or show skeletons?

A read whose key changes has **no answer yet** until the server replies. If
the screen renders skeletons on "no data", every refresh blanks it.

| The new read is… | On screen until it answers |
|---|---|
| **The same data again**: after a write, "read again" | **Keep the last answer.** Progress stays small (the button's spinner), never skeletons |
| **Different data**: another filter, item, page | **Skeletons** — old rows from another scope would show the wrong thing |

- Keeping it: remember the last answer **for the same scope** and fall back to
  it while the new one is pending (`placeholderData: keepPreviousData` if the
  read goes through react-query).
- An optimistic change stays applied until the fresh answer lands.
- Say which one it is in a comment next to the read (`// re-read: keeps the
  list` / `// new scope: skeletons on purpose`).

## 6. Libraries we have — don't add another

| Need | We use |
|---|---|
| Icons | `lucide-react` only |
| Primitives | `radix-ui` / `@base-ui/react` via the shadcn components in `web/components/ui` |
| Toasts | `sonner` (`components/ui/sonner.tsx`; mount `<Toaster />` once in `web/app.tsx` the first time) |
| Forms | `react-hook-form` + `@hookform/resolvers` + Zod (`components/ui/form.tsx`, `field.tsx`) |
| Charts | `recharts` via `components/ui/chart.tsx` |
| Dates | `date-fns` |
| Data fetching / cache | `@tanstack/react-query` |
| Routing | `@tanstack/react-router` (`web/router.tsx`) |

Need something else (virtual lists, JS motion)? Add one shared wrapper in
`web/components/` with its dependency, so every screen gets the same one.

## 7. Checklist for a UI change

- [ ] Screen plan written (§0) for a new screen or a layout change.
- [ ] Reused `web/components/ui`; no copied component.
- [ ] Every state handled: the MCP statuses, pending, failed, empty,
      filtered-to-nothing — a failing block fails alone.
- [ ] A refresh after a write keeps the screen (no skeleton flash).
- [ ] View state that should survive a reload is in the route, not `useState`.
- [ ] Light and dark both read (tokens, no raw colours; the host sets
      `data-theme`).
- [ ] Screenshot from Studio (`bun start`), both themes.
- [ ] `qa` before the PR.
