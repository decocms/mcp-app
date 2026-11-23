# Visual identity — the master rules

**This file wins.** Every screen of this MCP App reads as one product. Where `studio-ui` or an older habit says otherwise, follow
this file. A deliberate exception gets a comment next to the code saying why.

From deco's finance dash rules, by way of ops-control-plane and channels;
the components are this template's own (`web/components/ui`), the rules are
shared.

---

## 1. The filter row

- **One filter row per list**, verb first: search, then Sort, Filter, Group
  — buttons of the same height, on the **right** of their row (search
  included), the primary action ("+ New") at its end. Above a list with a
  section title, the row goes in the section header's actions: title and count
  left, the row right, one line.
- A verb that is cutting the list shows it ("Filtered 2", in the accent: the
  one place the accent marks state on a control — *your* cut of the list).
- **A row of `<NativeSelect>`s as filters is the old pattern.** A select in a
  *form* (editing a record) is fine. The target is one shared `FilterBar`
  (search + Sort / Filter / Group menus) in `web/components/`; build it there
  the first time a list needs more than a search.
- **Picking the default removes the filter.** "Nothing picked" is the
  default and never counts as a filter. Don't offer "All X" as an option.
- **A dimension exists only where it changes the list.**
- **Search names what it reaches**: the placeholder lists the fields ("Buscar
  nome, e-mail, grupo"). Match accent- and case-insensitively.
- **Every menu reads A→Z** ("None"/"Default" on top).
- **State lives in the route** (search params in `web/router.tsx`), so tabs
  and a Studio reload keep it.
- **While the rows haven't arrived** the row draws; the verbs wait.

## 2. Page structure

- **The title row is the title's.** The page title (+ its `meta`) only — no
  search, filters, count chips or date pickers next to it. Controls go on
  the next row, beside the tabs on a tabbed page.
- Numbers on top, then sections.
- **Use the width.** A screen where the person works or compares uses the
  whole window and a main + aside grid; the aside is the reference, kept in
  view with `lg:sticky`. A centred narrow column is only for long text.

## 3. Numbers on top

- Labels are **short noun phrases** (≤ ~16 characters), sentence case.
- **Don't repeat what a filter already says.**
- Every number explains itself: a hint says what it counts and the basis.
- Tone encodes state (`warning`, `success`, `muted`), never decoration.

## 4. Typography

- **No uppercase labels, no `tracking-*`.** Sentence case everywhere.
- Canonical sizes only: `text-meta`, `text-2xs`, `text-xs`, `text-sm`… — no
  `text-[Npx]`.
- Numbers `tabular-nums`. Dates only through the app's one formatter in
  `web/lib/` — never `toLocaleString` by hand.

## 5. Colour

- Tokens only (`var(--…)` / Tailwind token classes from `web/globals.css`);
  no hex in components. A third-party brand mark is the exception, declared
  once as a CSS var.
- `destructive` = failed / disconnected / negative; `success` = good;
  `warning` = needs attention; `muted-foreground` = secondary text. (The
  template ships `destructive` and `muted`; add `success` / `warning` tokens
  to `web/globals.css` the first time a screen needs them.)
- **Colour encodes state, not decoration.** An accent (`brand`, if the app
  has one) = live, current, or yours.
- Kinds may have a colour (a source, a visibility class) — one colour per
  kind, the same everywhere it shows; never for state.

## 6. Tables

- Headers `text-xs` muted, sentence case, tinted apart from the rows so the
  first row never reads like data.
- **Tables that grow past ~20 rows scroll inside**, header frozen (the height
  is a ceiling, never a floor). Never wrap a `Table` in another
  `overflow-auto` div — its own container is the sticky parent.
- Frozen cells (header, first column) are opaque.
- **One line per row.** Names and numbers never wrap; long free text is cut
  with an ellipsis and the full text in `title`.
- **Every data row highlights on hover**; clickable rows add `cursor-pointer`.
- **Zero or missing values render as `—`**, not `0`.
- **Rows that need action carry a flag** next to the name with a tooltip that
  says why. Don't paint the whole row.
- **Columns a reader would reorder by are sortable** (the shared sortable header), and the
  list's Sort lists the same fields — one sort state drives both.

## 7. Charts

- Every chart has a styled tooltip (card background, border, foreground) —
  never the library default or the browser's `title`.
- A chart is a real chart: axes, values on bars, a light grid.
- The explanation is the section's subtitle, not a footnote.

## 8. Info `(i)`

- Exists only to host an explanation — one short sentence (≤ 100
  characters), naming its scope. Never decorative, never empty.
- Stays reachable when a table scrolls sideways (sticky first column or the
  section header).

## 9. Language

- **One language per screen**, never half and half. Pick the app's UI
  language once; data (names, messages) stays as stored.
- Copy is plain and specific: say *what* is missing and *why* ("No items
  connected yet"), sentence case, no em-dash-heavy AI phrasing.

## 10. Data states

- **Structure first.** The screen draws its real frame on the first frame
  (title, tabs, filter row, section titles, table headers); each block fills
  in when *its own* read answers (skeleton rows in place). No
  full-page spinner once the view is known.
- **Error** — never silent, scoped to the block: the message and a retry
  action; the rest of the screen keeps working.
- **Empty** — only after the read answered: `Empty` in place, saying what is
  missing. Filtered to nothing → say so, with a way to clear.
- **A refetch with the same filters dims nothing.** Changing filters keeps the
  old rows until the new ones arrive.

## 11. Links and dialogs

- External URLs through the host (`app.openLink`) — `window.open` hangs in
  Studio's sandbox.
- **No `alert` / `confirm` / `prompt`** (the sandbox swallows them). Confirm a
  destructive action with `AlertDialog` or in place (first click turns into
  "Click again to remove" in destructive), show progress, report with a
  toast.
