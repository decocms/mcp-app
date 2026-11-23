# Components

Every variant is live at https://designsystem.decocms.com. This page is the
map: which component does which job, the decocms-only pieces shadcn doesn't
have, how a page is composed from them, and the traps — each one produced a
visibly broken screen before it was written down. Checked against v1.21.

## By job

| Job | Use | Not |
|---|---|---|
| Action | `Button` | a styled `div`/`a` |
| Icon-only action | `IconButton` — its `label` is tooltip *and* `aria-label` | a bare icon inside `Button` |
| Primary action + alternatives | `SplitButton` (`label`, `onClick`, `items: { label, onSelect, icon? }[]`) | a button next to a dropdown |
| Segmented filter / pill tabs | `Button variant="tab"` + `aria-pressed` | chips with hand-set borders |
| Cards ↔ table switch | `ViewModeToggle` + `useViewMode(key)` | two buttons toggling state |
| Menu row | `Button variant="menu"` | `ghost` + `w-full justify-start` |
| Status / flag | `Badge` | a `span` with `style={{ color }}` |
| Person or org | `Avatar` (`fallback`, `shape`, `size` `3xs`…`3xl`) | initials in a styled `div` |
| Nothing to show | `EmptyState` (+ an `EmptyStateIllustrations` art) | a centered `<p>` |
| Loading | `Spinner`; `Skeleton` or a component's own `.Skeleton` | a hand-rolled spinning circle |
| Search on a list page | `CollectionSearch` (full-width, `h-12`, bottom border) | `Input` + a positioned icon |
| Search in a toolbar | `SearchToggle` (an `IconButton` until used) | an always-open field crowding the bar |
| Search in a panel | `SearchInput` | — |
| Structured filters | `FilterBar` + `usePersistedFilters(key)` | a row of ad-hoc selects |
| Sortable table | `Table` + `useSortable()` | sort state by hand |
| Multi-step flow | `StepIndicator` (`steps`, `currentStep`, `visited`, `onStepClick`) | "Step 2 of 4" text |
| Choice that must work on mobile | `ResponsiveSelect` / `ResponsiveDropdown` (drawer on mobile) | `Select` alone |
| Depth on demand | `Collapsible`, `Accordion` | always-open sections |
| Side form | `Popover`; larger → `Sheet`; blocking → `Dialog` | an inline form pushing content down |
| Destructive confirm | `AlertDialog` | `window.confirm` |
| Transient outcome | `Sonner` toast | a banner that never leaves |
| Rendered user/AI text | `Markdown` | `whitespace-pre-wrap` on raw markdown |
| Raw payload | `<pre className="surface-inset p-3 font-mono text-xs">` | `Markdown` |
| Copy to clipboard | `useCopy()` → `{ copied, handleCopy }` | `navigator.clipboard` + a timer by hand |

## decocms-only pieces

Compound components — parts hang off the root (`AppTopbar.Left`).

| Component | Parts | For |
|---|---|---|
| `AppTopbar` | `.Sidebar` `.Left` `.Center` `.Right` `.Skeleton` | The app's top bar: sidebar toggle, breadcrumb, environment, actions |
| `TopbarSwitcher` | `.Trigger` `.CurrentItem` `.Content` `.Panel` `.Search` `.Items` `.Item` `.Actions` `.Action` `.Separator` | Org / project switcher in the topbar |
| `UserMenu` | `.Item` `.Separator` `.Skeleton` | Account menu |
| `Sidebar`, `SidebarFooterShell` | shadcn sidebar parts | App navigation and its footer |
| `EntityCard` | `.Header` `.AvatarSection` `.Avatar` `.Content` `.Title` `.Subtitle` `.Footer` `.Badge` `.Skeleton` | One item in a collection: an agent, a connection, an app |
| `EntityGrid` | `.Skeleton`; `columns={{ sm, md, lg, xl }}` | The responsive grid of `EntityCard`s |
| `EmptyStateIllustrations` | `AgentsIllustration`, `ConnectionsIllustration`, `TasksIllustration`, `PagesIllustration`, `ExperimentsIllustration`, `WorkflowsIllustration`, `AdminsIllustration`, `StoreIllustration` | Monochrome art for `EmptyState`'s `illustration` |

## Composing a page

**Collection page** (agents, connections, apps):

```
AppTopbar
CollectionSearch                      ← full width, h-12, owns the border
[ FilterBar ]  [ ViewModeToggle ]
EntityGrid of EntityCard              ← or Table in table mode
  └─ empty → EmptyState + illustration + one primary action
```

**Detail page**: `AppTopbar` → one `surface` sheet with a title row (`text-sm
font-medium` + actions right) → content. Secondary facts go in a side panel or
behind a `Collapsible`, not stacked above the content.

**Dashboard**: a row of stat `surface`s, then list panels — see the specimens in
[design-system.md](design-system.md#canonical-patterns).

Loading states use the component's own `.Skeleton` (`EntityGrid.Skeleton`,
`AppTopbar.Skeleton`) so layout doesn't jump when data lands.

## Variants

- **`Button`** — `default` · `secondary` · `outline` · `ghost` · `destructive` ·
  `success` · `warning` · `brand` · `special` · `link` · `tab` · `menu` ·
  `sidebar`. Sizes `xs` · `sm` · `default` · `lg` · `xl` · `icon` · `icon-sm`.
  `brand` is the lime — one per screen, for the live/primary moment.
- **`Badge`** — `default` · `secondary` · `muted` · `outline` · `success` ·
  `warning` · `destructive`. **No `special` or `brand` badge** — use `outline`
  plus a color class (`text-special border-special/40`).

## Traps

**`Card` ships with no padding.** It's a `surface` with `gap-6`, but
`CardContent` has no padding at all and `Card` none vertically — content sits on
the edge. Supply `<Card className="py-5">` / `<CardContent className="px-6">`,
or skip `Card` and use `surface p-5` directly.

**`ring-*` erases `surface`.** Both are `box-shadow`; the later class wins and
the card loses its edge. Use `focus-ring` for focus, `card-ring-*` to recolor.

**Don't add `border` to a `surface`.** The ring is the border.

**Don't add `tracking-*` or `text-[Npx]`.** Tracking is in the scale;
`text-2xs` (11px) and `text-meta` (12px) cover the small sizes.

**`overflow-x-auto` clips vertically too.** A scrolling chip row slices the
selected chip's ring. Give the scroller `py-1` (and `-mx-1 px-1`).

**Percentage heights need a definite parent.** A CSS bar at `height: 60%` in an
`auto`-height column renders at zero. Put it in a `flex-1 min-h-0` track.

**Grid rows stretch to their tallest cell.** A short panel beside a tall one
opens a void. Use independent flex columns inside the grid, `items-start`.

**`Textarea` already auto-grows** (`field-sizing-content`). Cap it with
`max-h-28 overflow-y-auto`; no JS autoresize.

**Check the icon exists.** `@untitledui/icons` has no brand marks (no Slack, no
Discord). Grep `node_modules/@untitledui/icons/dist/index.d.ts` before importing
a guessed name.

**Theme is `.dark`.** If the host sets `data-theme`, mirror it onto `<html>`'s
class list with a `MutationObserver`.

**The fonts are heavy.** `global.css` pulls Switzer, Inter and Commit Mono. In a
single-file bundle (MCP Apps), drop the `@font-face` rules and let the host or
system stack supply the face.

**JSX attribute lists can't hold `//` comments.** Put them above as `{/* */}`.
