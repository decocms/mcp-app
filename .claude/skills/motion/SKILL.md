---
name: motion
description: When and how to animate in this MCP App — the "does this deserve animation?" checklist, duration/easing tokens, prefers-reduced-motion, CSS transitions for hover/press, and where motion recipes go (one shared web/components/motion.tsx). Load before adding any animation, transition, or "charm" to a screen or component in web/.
paths:
  - "web/**"
---

# Motion

Motion explains a change; it is never decoration and never makes someone
wait. Small, fast, ease-out, and off for anyone who asked for less.

## Does this deserve animation?

| Yes | No |
|---|---|
| A new row/item entering a list (a message, a token created) | Tables with many rows (more than ~20) |
| A state change: status, toggle, "saved", an account connecting | Text being read (messages, documents, profiles) |
| A number that changes (a count) | Anything longer than 300 ms (our cap is 250) |
| Opening/closing a dialog, popover | Loops, pulses, bouncing attention-grabbers (a spinner is not decoration: it carries "still working") |
| Reorder | Decorative motion that delays an action |

Doubt → don't. Dialogs, popovers, tooltips and dropdowns in
`web/components/ui` **already animate**: never add a second
animation on top.

## Rules

1. **Hover, press, focus = CSS**, not JS: `transition-colors`,
   `transition-shadow`, `active:scale-[0.98]` with `duration-150` (the
   `Button` already does it).
2. **Tokens, not numbers.** 120 / 180 / 250 ms, ease-out (`ease-out`, or an
   `--ease-out-cubic` token added once to `web/globals.css`). A keyframe
   recipe (an entrance like `animate-rise`) goes in `web/globals.css` once
   and is reused — never `@keyframes` in a screen.
3. **Always `prefers-reduced-motion`**: a CSS animation sits under
   `motion-safe:` (or `motion-reduce:` turns it off); a JS one checks
   `useReducedMotion()`.
4. **JS motion goes through recipes in one shared file, never `motion`
   imported into a screen.** None exist yet: the first screen that needs one
   adds `web/components/motion.tsx` (`FadeIn`, `ListMotion` +
   `ListItemMotion`, `AnimatedNumber`; `LazyMotion` + `domAnimation`, reduced
   motion built in) with its `motion` dependency. Mind the bundle: the whole
   UI is one inlined HTML file.
5. A refresh that keeps the screen (`ui-components` §5) must not animate the
   rows again — skip the first paint.

## Before / after

```tsx
// before: custom keyframes in the screen's css
<div className="card pulse-on-hover" />

// after: a CSS transition, no JS, no keyframes
<div className="rounded-xl border bg-card transition-shadow duration-150 hover:shadow-md" />
```
