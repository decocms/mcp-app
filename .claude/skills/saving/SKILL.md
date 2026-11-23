---
name: saving
description: How a screen in this MCP App saves — what the person changed shows at once (optimistic), a save in flight is visible and can't be sent twice, typing saves on blur (never per key), and a failure says so and puts the screen back. Which piece each control uses (useSubmit / useSavedValue / CommitInput / Button pending, built once in the UI kit). Load before any form, Save/Add/Remove/Connect button, toggle, select, checkbox or field that writes in web/.
paths:
  - "web/**"
---

# Saving

The rule: **nobody waits on the server to see what they did, and nobody can
send the same save twice.** Clicking Save and seeing nothing until the server
answers makes people click again, and every click is a new request.

## The pieces

A write from a screen is a tool call (`useMcpApp()?.callServerTool`, or a
react-query `useMutation` around it — `screens-and-tools`). The template
ships none of the pieces below yet. Build each one **once, the first time a
change needs it**, in the UI kit — never per screen:

| Piece | What it does | Goes to |
|---|---|---|
| `useSubmit(fn)` → `[run, pending]` | runs a save once; a second call while pending is dropped | `web/lib/save.ts` |
| `useSavedValue(server, save)` → `[value, set]` | shows the new value at once; one save in flight, then only the last value; on failure toasts and goes back to `server` | `web/lib/save.ts` (with a test) |
| `<Button pending>` | spinner on that button, disabled while pending | a `pending` prop on `web/components/ui/button.tsx` |
| `CommitInput` | an input that saves on blur/Enter, read-only while saving, restores on failure | `web/components/commit-input.tsx` |

## Which piece, for which control

| The control | Use | What the person sees |
|---|---|---|
| A value saved as it changes: toggle, switch, select, checkbox, a status in a row | `useSavedValue(server, save)` | The new value **at once**. Fast changes collapse: one save in flight, then only the last value. A failure toasts and shows the server's value again |
| A save someone clicks: Save, Add, Remove, Send, Connect, Create token | `useSubmit(fn)` + `<Button pending>` | A spinner on **that** button, which takes no second click while it runs. A failure toasts; a success toasts when the change isn't visible on screen |
| Text that saves when you leave the field (a name) | `CommitInput` with `onCommit` **returning the save's promise** | Saves on blur/Enter, never per key. Read-only while saving; on failure the saved text comes back, with a toast |
| A list a write reorders (a row removed, an item moved out of a filter) | local optimistic state + rollback | The row moves at once; the re-read keeps the screen (`ui-components` §5) |

Wrap the write: `useSubmit((v) => call("archive_item", { id, … }))`,
`useSavedValue(row.enabled, (v) => call("set_enabled", { id, enabled: v }))`.

## Optimistic or pending?

- **Optimistic** when the result is known before the server answers: a
  choice among values, on/off, a move. Almost every control in a row.
- **Pending** when the result needs the server: creating something (its id,
  a token shown once), sending, connecting an account, anything that can be
  refused for a reason the screen can't know. Also destructive actions —
  show "Removing…" rather than hiding the row first.
- Either way: **one request per intent**.

## Never

- A control bound straight to the server's value with an `onChange` that
  calls the tool (it doesn't move until the server answers).
- A hand-written `useState(busy)` + `if (busy) return` + spinner: that is
  `useSubmit` + `Button pending`. Touching one? Build the pieces and replace
  it (boy-scout rule).
- Saving per keystroke. A live search is a read, not a save.
- A save whose failure is silent: every path ends with the screen as the
  server has it, plus a toast saying what failed.
- Blanking the screen while it re-reads after a save.

## Checklist

- [ ] Every control that writes uses one of the pieces above.
- [ ] Clicking twice fast sends one request (or, for a toggle, ends on the last value).
- [ ] A failure shows a toast and the screen goes back to the saved value.
- [ ] Nothing blanks or jumps while it re-reads.
