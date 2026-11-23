---
name: studio-ui
description: >-
  Build or fix product screens with the decocms design system (`@decocms/ui`,
  https://designsystem.decocms.com): the system's vocabulary (`surface`,
  `text-meta`, radius by role, where the lime goes), which component to reach
  for, the type hierarchy, and — most of all — how to cut a screen down to what
  the user actually needs. TRIGGER when: building a new screen, panel, dashboard
  or MCP App UI for a decocms product; when a screen "looks cluttered", "has no
  hierarchy", "has too much text" or "doesn't look like our design"; when
  migrating hand-rolled or shadcn UI to `@decocms/ui`; or when reviewing a UI
  diff. SKIP for marketing pages, decks and brand artifacts — that is
  `deco-brand-guidelines` — and for inventorying an existing storefront's
  components, which is `map-design-system`.
paths:
  - "web/**"
---

> **In this template**: components are shadcn/ui in `web/components/ui`,
> styled by the host's tokens in `web/globals.css` — not `@decocms/ui`. The
> DS vocabulary below (`surface`, `surface-inset`, `text-meta`,
> `font-display`, `tnum`, `focus-ring`, `card-ring-*`) is **not** in
> `web/globals.css` yet: the first screen that needs one adds it there as an
> `@utility` (values in [references/design-system.md](references/design-system.md)),
> or the app adopts `@decocms/ui` wholesale via the Setup section. Never
> hand-roll the same look per screen. A DS component the kit lacks is a
> judgment the `ui-components` skill makes (§1): reuse, extend, or add it to
> `web/components`. Where this skill and `ui-components` disagree,
> `ui-components` wins.

# Screens with the decocms design system

`@decocms/ui` gives you the parts: React 19 components on Radix, Tailwind v4
semantic tokens, light and dark for free, and a small vocabulary of utilities
that carry almost every surface and label. It does not stop you from putting
too much on the screen. That is where screens go wrong, so that is most of this
skill.

**The source of truth is the DS's own "The System" page**
(`Design System → The System` in the Storybook). Its closing line: *if a screen
disagrees with this page, the screen is wrong* — including existing Studio
screens, many of which predate it. Don't copy patterns from a screen; copy them
from the foundations.

## The one thing to get right

**Every element has to earn its place.** Before anything stays on screen, ask:

1. Does it change what the user does next?
2. Is it already said somewhere else on this same screen?

If (1) is no, cut it or fold it behind a disclosure. If (2) is yes, keep the
single best telling and cut the rest. Most clutter is (2): the same fact told
three ways — a channel spelled out in text *and* shown by the avatar ring *and*
implied by the filter the user is already in.

## Text

- **No description under a title** — 90% of the time. If the title needs a
  subtitle to be understood, fix the title.
- **Labels, not sentences.** `Pendentes`, not `Conversas aguardando resposta`.
  No helper text that restates its label.
- **Show a number only when it's new.** A count that duplicates a badge
  elsewhere appears once a filter or search narrows the list, not before.
- **Learned-once hints wait for focus.** A keyboard shortcut hint shows while
  the field is focused, not under every item.
- **Outcomes always show.** Cutting text never means hiding "sent" or "failed".

## The vocabulary

Four utilities carry nearly every surface and label. Reach for them before any
hand-rolled `bg-*` / `rounded-*` / `shadow-*` combination.

| Utility | Is | Use for |
|---|---|---|
| `surface` | White sheet, 14px corner, hairline ring + faint shade | Anything that holds content — a card, a panel, a list |
| `surface-interactive` | Raises on hover (pair with `surface`) | A card you can pick up or open |
| `surface-inset` | A well: `bg-muted`, no shadow | Something drawn *inside* a surface — nested list, code block |
| `text-meta` | 12px, muted, tabular figures | The facts under a title: status, owner, time, cost |

Plus `font-display` for a headline (tracking and weight baked in), `tnum` for
numbers that line up or tick, and `focus-ring` for focus — never `ring-*`,
which shares `box-shadow` with `surface` and silently erases it.

Pages are layered: `bg-background` is the **shell** (sidebar, gutter), `surface`
is the **sheet** — the only pure white — and `surface-inset` is a **well** in it.

## Hierarchy

Hierarchy comes from **role**, carried by the scale — not from picking pixel
sizes. The DS sets `text-sm` to **13px** and bakes tracking into every step, so
never add `tracking-*` or arbitrary sizes like `text-[11px]`.

| Role | Class | Example |
|---|---|---|
| Figure / headline | `font-display text-2xl`–`text-3xl`, `tnum` for numbers | `$1.2k`, a page title |
| Title | `text-sm font-medium text-foreground` | A panel header, a list item's name |
| Body | `text-sm text-foreground` · secondary `text-muted-foreground` | Content, a summary |
| Caption | `text-meta` | `farm · 12m ago`, `3 of 7` |

- **One figure or title leads each region.** Everything else steps down.
- **A section label is quieter than the data it names.** Use `text-meta` or
  `text-sm text-muted-foreground`, sentence case. **No all-caps tracked labels**
  — the DS rejects them explicitly.
- **Spacing groups.** More space *between* blocks than *inside* them. Uniform
  gaps make one undifferentiated stack.

## Color & emphasis

- **Semantic tokens only**: `bg-primary`, `text-muted-foreground`,
  `border-border`, `variant="warning"`. Never hex. Exception: a third-party mark
  (Gmail red, Discord blurple), declared once as a CSS var.
- **Lime (`brand`) means live, current, or yours — nowhere else.** A fill or a
  mark, never a word on the page. `success` is status green, not a brand green.
  `special` is for AI features.
- **Loudness is a budget.** At most one solid-filled accent per region. Flags
  and secondary status are `outline` or `muted` badges.
- **Counts are information, not alarms** — `secondary`, not `destructive`.

## Structure

- **Default view = what the user acts on.** Depth (full analysis, raw payload,
  email envelope, quoted thread) goes behind a `Collapsible`, closed. Group
  related detail into *one* disclosure, not N rows of chrome.
- **A region with nothing to say doesn't render.** Let the main content take
  the width instead of a column holding one sentence.
- **Primary actions never scroll.** Pin them; show one obvious next step and let
  it change with state.
- **Actions look like actions**; metadata never looks clickable.
- **Raw payloads render raw** — prompt, JSON, log in monospace `surface-inset`,
  never through `Markdown`. Mono is only for things you copy or compare
  character by character; captions stay in the sans.

## Workflow: fixing a screen

1. **Look at it.** Screenshot the real screen, both themes — reading JSX alone
   misses what the eye lands on.
2. **Inventory.** List every element; mark each *keep / cut / fold / move* with
   the two questions. Expect to cut a third.
3. **Assign roles** — the one figure/title per region, then body and caption.
4. **Swap in the vocabulary and DS components** —
   [references/components.md](references/components.md).
5. **Replace raw color, radius and shadow with tokens** —
   [references/design-system.md](references/design-system.md).
6. **Test with real data, not fixtures.** Long names, missing fields, `Name
   <a@b.com>` headers, huge bodies. Clean mock data hides the worst breakage.
7. **Run** [references/review-checklist.md](references/review-checklist.md).

## Setup

```bash
bun add @decocms/ui react react-dom
```

```css
@import "@decocms/ui/styles/global.css";
@source "../src"; /* the stylesheet only scans the DS's own components */
```

```tsx
import { Button } from "@decocms/ui/components/button.tsx";
import { cn } from "@decocms/ui/lib/utils.ts";
```

Icons are `@untitledui/icons`. Dark mode keys off `.dark` on `<html>` — if the
host announces theme another way (an MCP host sets `data-theme`), mirror it.

**Check the version first.** The vocabulary above is recent — if `surface` or
`text-meta` don't resolve, the project's copy predates it (v1.17 had neither).
Update before styling anything, or you'll hand-roll what the system now ships.

**Not on npm yet?** (`npm view @decocms/ui` 404s) Vendor it with
[scripts/sync-ds.ts](scripts/sync-ds.ts), alias `@decocms/ui` to the vendored
folder in `vite.config.ts` and `tsconfig.json`, and keep importing
`@decocms/ui/components/<name>.tsx` — a real subpath of the package's
`exports`, so deleting the alias is the whole migration. Never hand-edit the
vendored folder.

## Files

| File | Read when |
|---|---|
| [references/design-system.md](references/design-system.md) | Tokens, type scale, radius, color roles, elevation, motion, and the patterns the DS rejects |
| [references/components.md](references/components.md) | Choosing a component, composing a page, or a component misbehaves |
| [references/review-checklist.md](references/review-checklist.md) | Before calling a screen done, or reviewing a UI diff |
| [scripts/sync-ds.ts](scripts/sync-ds.ts) | Vendoring `@decocms/ui` before it's on npm |
