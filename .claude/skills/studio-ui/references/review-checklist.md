# Review checklist

Run this against a screenshot, not just the diff. Every item is a yes/no; a
"no" is a fix, not a judgment call.

## Content

- [ ] Every title stands alone — no subtitle explaining it.
- [ ] No element states a fact another element on the same screen already states
      (name, source, status, time, count).
- [ ] No count that duplicates a badge, unless a filter or search is active.
- [ ] No permanent hint for something learned once (shortcuts, "click to…").
- [ ] Author labels hidden where position already says who (a 1:1 chat); shown
      when a third voice appears.
- [ ] Empty-able regions disappear when empty instead of holding one sentence.

## Hierarchy

- [ ] Each region has one figure or title leading, and it is visibly the
      strongest thing in the region.
- [ ] Captions use `text-meta`; no arbitrary `text-[Npx]`, no `tracking-*`.
- [ ] No all-caps tracked labels. Section labels are sentence case and quieter
      than the data under them.
- [ ] Gaps between blocks are larger than gaps inside blocks.

## Vocabulary

- [ ] Content sits on `surface` (not hand-rolled `bg-card rounded-* shadow-*`);
      nested content on `surface-inset`; openable cards add `surface-interactive`.
- [ ] No `border` on a `surface`; no `ring-*` on one. Focus uses `focus-ring`.
- [ ] No `rounded-*` overriding a DS component — radius follows role (button
      pill, control 10px, surface 14px).
- [ ] Mono only for identifiers and code — never captions, times or statuses.

## Color

- [ ] No hex, no `rgb()`, no inline `style={{ color }}` — tokens only (third-party
      marks via one CSS var are the exception).
- [ ] Lime (`brand`) appears only for live, current, or yours — never as text.
- [ ] At most one solid-filled accent per region; flags are `outline` / `muted`.
- [ ] AI-authored things use `special`; positive state uses `success`, not a brand
      green.
- [ ] None of the rejected patterns: decorative gradients, glows, glass, cream
      page, display serif, three identical icon-on-top cards.

## Actions

- [ ] Primary action is visible without scrolling.
- [ ] One obvious next step — the action set changes with state rather than
      listing everything at once.
- [ ] Every icon-only control is an `IconButton` with a `label`.
- [ ] Anything clickable looks clickable; nothing clickable looks like metadata.

## System

- [ ] No hand-rolled version of a component the DS ships
      (see [components.md](components.md)).
- [ ] Loading uses the component's `.Skeleton` so layout doesn't jump.
- [ ] Correct in light *and* dark.
- [ ] Nothing clipped at the narrowest supported width (chips, rings, badges).

## Data

- [ ] Checked against real data, not fixtures: long names, missing optional
      fields, `Name <a@b.com>` headers, address-only senders, very long bodies,
      quoted email chains, zero-item and one-item lists.
- [ ] Raw payloads (prompts, JSON, logs) render monospace, not as markdown.
