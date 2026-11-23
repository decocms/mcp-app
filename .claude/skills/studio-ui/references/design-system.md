# The design system

Condensed from `@decocms/ui`'s foundations (`Design System → The System`,
`Colors`, `Typography`) and `styles/global.css`, v1.21. When this page and the
Storybook disagree, the Storybook wins — it is versioned with the code.

## Surfaces

A white sheet of work resting inside a quiet shell.

| Token | Role |
|---|---|
| `bg-background` | The **shell** — page, sidebar, gutter. Steps just off white |
| `bg-card` / `surface` | The **sheet** — main panel, cards. The only pure white |
| `bg-muted` / `surface-inset` | A **well** recessed into a sheet |
| `bg-popover` | Floating — menus, tooltips |
| `bg-accent` | Hover and selection |
| `text-foreground` | Ink. Never pure black |
| `text-muted-foreground` | Secondary text |

## Color roles

| Group | Tokens |
|---|---|
| Actions | `primary` · `secondary` |
| Status | `destructive` errors · `success` positive · `warning` caution · `special` highlights and **AI features** · `brand` brand moments |
| Chrome | `border` dividers · `input` control borders · `ring` focus |
| Sidebar | `sidebar` · `sidebar-accent` · `sidebar-primary` · `sidebar-border` |
| Charts | `chart-1` … `chart-5`, in series order |

Each has a `-foreground` pair for text on that fill (`bg-warning
text-warning-foreground`).

**The greens are not interchangeable.**

| Green | Value | Rule |
|---|---|---|
| `brand` · lime | `#d0ec1a` | Fill only, forest text on it. Means *live, current, or yours* — a running agent's dot, the org you're in, the one primary moment. Never a word on white |
| `--brand-green-dark` · forest | `#07401a` | A dark surface. Never text on white |
| `brand-soft` | `#8caa25` | The green allowed to be a mark or label |
| `success` | status green | Positive state. Not a brand green |

## Type

**Switzer** sets the whole product — headline, prose and caption (Inter is the
fallback while it loads). **Commit Mono** is reserved for strings you copy or
compare character by character: hashes, paths, commands, IDs. Captions in mono
read as log output — "failed" and "2d ago" are language.

Body renders at weight 450; `font-bold` maps to 650, a softer bold.

| Class | Size | Typical role |
|---|---|---|
| `text-2xs` | 11px | Dense chrome only — a count in a badge |
| `text-xs` / `text-meta` | 12px | Caption — the facts under a title |
| `text-sm` | **13px** | Interface default — titles, body, controls |
| `text-base` | 15px | Reading text |
| `text-lg` | 17px | Section heading |
| `text-xl` · `text-2xl` | 20 · 24px | Page title |
| `text-3xl` · `text-4xl` · `text-5xl` | 31 · 40 · 52px | Figures, display |

Tracking tightens as size grows **inside the scale** — never add
`tracking-tight` by hand. For a headline use `font-display` (weight 640,
−0.03em, balanced wrap); there is no second display family.

## Radius by role

A component takes the radius of what it *is*, never a size that looks about
right. Three values build the whole product:

| Role | Radius | Token |
|---|---|---|
| Button | pill, always | `--studio-button-radius` |
| Control (input, select) | 10px | `--studio-control-radius` |
| Surface (card, panel) | 14px | `--studio-surface-radius`, via `surface` |

DS components already carry theirs — don't override with `rounded-*`.

## Elevation

Wide and faint, never dark and tight — the shade a sheet casts on the one
beneath it. A card rests; only something you can pick up rises.

| State | Use |
|---|---|
| At rest | `surface` (ring + faint drop) |
| Can be picked up | `surface surface-interactive` → raises on hover |
| Floating | `shadow-lg` (popovers, menus) |
| Flagged card | `card-ring-destructive` / `card-ring-warning` recolor the ring |

The ring **is** the border, drawn as a shadow — don't add `border` to a
`surface`, and don't use `ring-*` on one (both are `box-shadow`; the last one
wins). Focus uses `focus-ring` (an outline) or `focus-ring-inverted` on filled
and dark surfaces.

## Motion

UI transitions use `var(--ease-out-cubic)` at 150–200ms. The full set is
`--ease-{in,out,in-out}-{quad,cubic,quart,quint,expo,circ}`.
`prefers-reduced-motion` is handled globally; spinners keep turning, slower,
because they carry information.

## Other utilities

`tnum` tabular figures · `no-scrollbar` · `always-scrollbar` (visible at rest,
so a list reads as scrollable) · `fade-text-end` (masks text under a floating
corner control) · `border-shadow`.

## Deliberately not here

The DS lists these as considered and rejected — each is what a generator
reaches for when nobody decided anything, and shipping one makes a product
forgettable rather than ugly.

- **A display serif** — the current AI-brand house style.
- **A cream page** — kills the lime.
- **Blue-to-purple gradients** — there are no decorative gradients at all.
- **All-caps tracked labels** — a crutch for "this is a label".
- **Glassmorphism and coloured glows** — elevation is a shadow cast, not light emitted.
- **Icon-on-top feature cards** — three identical boxes in a row.

## Canonical patterns

The DS's own specimens. If yours reads worse than these at a glance, simplify.

**Stat**

```tsx
<div className="surface flex flex-col gap-3 p-5">
  <span className="text-sm text-muted-foreground">Runs today</span>
  <div className="flex items-baseline gap-2">
    <span className="tnum text-3xl font-semibold text-foreground">38</span>
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <span className="size-1.5 rounded-full bg-brand" />2 live
    </span>
  </div>
  <span className="text-meta">last 14 days</span>
</div>
```

A trend is `tnum text-xs font-medium text-success`. Two figures side by side
(running · paused) put the lesser one in `text-muted-foreground`.

**List panel**

```tsx
<div className="surface overflow-hidden">
  <div className="flex h-12 items-center justify-between border-b border-border/70 px-5">
    <h3 className="text-sm font-medium text-foreground">Waiting on you</h3>
    <Button variant="ghost" size="sm">See all</Button>
  </div>
  <ul className="divide-y divide-border/70">
    <li className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-accent/30">
      <span className="min-w-0 truncate text-sm text-foreground">Checkout drops on iOS Safari</span>
      <span className="text-meta shrink-0">loja-verde · 1h ago</span>
    </li>
  </ul>
</div>
```

Title left, one quiet action right, rows of `title · caption`. No subtitle under
the header, no icon per row unless the icon distinguishes rows.
