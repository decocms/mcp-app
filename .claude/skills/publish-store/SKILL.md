---
name: publish-store
description: Use when the user asks to publish to the store, publish to the registry, publish to studio, set up publishing, configure deco.json/app.json for publishing, troubleshoot publish errors, or understand how the deco store publish flow works.
---

# Publishing to the Store

## Overview

MCP apps publish to the deco studio registry via HTTP POST to a `publish-request` endpoint. After submitting, the deco team reviews the request and notifies the requester by email whether it was approved, rejected, or needs adjustments.

Two publishing modes:

| Mode | URL | Token Required | Visibility |
|------|-----|----------------|------------|
| **Public (deco store)** | `https://studio.decocms.com/org/deco/registry/publish-request` | No | All deco clients |
| **Private (org store)** | Get the URL from your org's Studio settings (see below) | Depends on org settings | Org members only |

---

## Getting the Publish URL and API Token from Studio

### Finding the Publish URL

1. Go to your org's registry settings in Studio:
   `https://studio.decocms.com/{org-slug}/settings/store/registry`
   (replace `{org-slug}` with your organization slug, e.g. `https://studio.decocms.com/deco/settings/store/registry`)
2. Find the **Publish Requests** card
3. The card shows a toggle to enable/disable external publish requests
4. When enabled, the **publish URL** is displayed in the card — copy it
   - Example: `https://studio.decocms.com/org/deco/registry/publish-request`
5. If the toggle is **disabled**, external publishing is not available for that org

### Getting an API Token (if required)

1. In the same **Publish Requests** card, check if **Require API Token** is enabled
2. If enabled, requests without a valid token will be rejected
3. To generate a token:
   - The **API Keys** section appears below the Require API Token toggle
   - Enter a key name (e.g. "CI/CD Pipeline")
   - Click **+ Generate**
   - **Copy the key immediately** — it is shown only once and cannot be retrieved later
   - If you lose it, generate a new one
4. If **Require API Token** is disabled, no token is needed

### Rate Limiting

The **Rate Limit** section in the same card controls how many publish requests are allowed per time window:
- **Max requests**: default 100
- **Window**: Per hour or per minute

---

## Config File: `deco.json` / `app.json`

The publish workflow reads **`deco.json`** (preferred) or falls back to **`app.json`**. They are the same file with different names — always prefer `deco.json`.

### Full Schema

```json
{
  "scopeName": "my-org",
  "name": "my-mcp",
  "friendlyName": "My MCP App",
  "description": "Short description of what this MCP does (1-2 sentences).",
  "icon": "https://example.com/icon.png",
  "unlisted": false,
  "official": false,
  "connection": {
    "type": "HTTP",
    "url": "https://my-mcp.decocache.com/api/mcp",
    "configSchema": {}
  },
  "requester": {
    "name": "Your Name or Organization",
    "email": "contact@example.com",
    "repository": "https://github.com/org/repo"
  },
  "metadata": {
    "categories": ["Developer Tools"],
    "tags": ["automation", "api"],
    "short_description": "One-line description (max 160 chars).",
    "mesh_description": "Longer description for AI agents (2-3 paragraphs)."
  },
  "tools": [
    { "name": "tool_name", "description": "What the tool does" }
  ]
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `scopeName` | Yes | Namespace/owner of the app (e.g. `"deco"`, `"my-org"`) |
| `name` | Yes | Unique identifier (kebab-case, e.g. `"my-mcp"`) |
| `friendlyName` | No | Human-readable display name |
| `description` | No | Short description (1-2 sentences) |
| `icon` | No | URL to the app icon |
| `unlisted` | No | If `true`, the app **will NOT be listed** in store search/browse even if approved. Still accessible by direct ID. Use for internal or beta apps. |
| `official` | No | Marks the app as verified/official in the registry |
| `connection.type` | No | `"HTTP"`, `"SSE"`, `"Websocket"`, or `"BINDING"` |
| `connection.url` | No | Production URL of the MCP server |
| `connection.configSchema` | No | JSON Schema for OAuth/config (presence marks the app as having OAuth) |
| `requester.name` | Recommended | Name of the person or organization submitting. **Used for review communication.** Falls back to git committer name. |
| `requester.email` | Recommended | Contact email. **Deco sends approval/rejection notifications here.** Falls back to git committer email. |
| `requester.repository` | Recommended | Link to the source repository (public or private). Used by the review team as reference. |
| `metadata.categories` | No | Category list (only the first is used in the registry) |
| `metadata.tags` | No | Tags for search/filtering |
| `metadata.short_description` | No | One-liner, max **160 characters** |
| `metadata.mesh_description` | No | Long description for AI agents (2-3 paragraphs). Used as fallback if no `README.md` exists. |
| `metadata.mesh_unlisted` | No | Same as `unlisted` — prevents listing even if approved |
| `tools` | No | Array of `{ name, description }` for registry metadata |

---

## Requester Info

Every publish request includes requester information so the deco team can:
1. Know who submitted the app
2. Send email notifications (approved / rejected / adjustments needed)
3. Reference the source code during review

**Priority for requester fields:**
1. `requester` object in `deco.json` / `app.json` (preferred)
2. Git committer name + email (automatic fallback)

Always fill in the `requester` fields in your config file for reliable communication.

---

## How Publishing Works

### 1. Submit a Publish Request

The GitHub Actions workflow (or manual `curl`) sends a POST request with the app metadata. This creates a **pending** publish request.

### 2. Review by Deco Team

The deco team reviews the submission:
- Checks the app metadata, description, and tools
- May request adjustments via email

### 3. Notification

The requester receives an email at the address provided:
- **Approved**: App appears in the store (unless `unlisted: true`)
- **Rejected**: Email explains why
- **Adjustments needed**: Email details what to change, resubmit after fixing

### 4. Visibility After Approval

- `unlisted: false` (default) — App is **listed** in store search and browse
- `unlisted: true` — App is **NOT listed** but still accessible by direct ID

---

## Publish Payload

The workflow builds a payload from your config. Here's how fields map:

| Payload Field | Source |
|---------------|--------|
| `data.id` | `${scopeName}/${name}` |
| `data.title` | `friendlyName` or `name` |
| `data.description` | `description` or `null` |
| `data.is_public` | `!(unlisted \|\| metadata.mesh_unlisted)` |
| `data._meta["mcp.mesh"].verified` | `metadata.official` or `official` |
| `data._meta["mcp.mesh"].tags` | `metadata.tags` |
| `data._meta["mcp.mesh"].categories` | First element of `metadata.categories` |
| `data._meta["mcp.mesh"].friendly_name` | `friendlyName` |
| `data._meta["mcp.mesh"].short_description` | `metadata.short_description` (max 160 chars) |
| `data._meta["mcp.mesh"].owner` | `scopeName` |
| `data._meta["mcp.mesh"].readme` | `README.md` content (max 50,000 chars), fallback to `metadata.mesh_description` |
| `data._meta["mcp.mesh"].has_remote` | `true` if `connection.type !== "BINDING"` and `connection.url` exists |
| `data._meta["mcp.mesh"].has_oauth` | `true` if `connection.configSchema` exists |
| `data._meta["mcp.mesh"].tools` | `tools` array |
| `data.server.name` | `name` |
| `data.server.title` | `friendlyName` or `name` |
| `data.server.description` | `description` |
| `data.server.icons` | `[{ src: icon }]` if `icon` exists |
| `data.server.remotes` | `[{ type, url, name, title, description }]` if has_remote |
| `data.server.repository` | `{ url: requester.repository }` if provided |
| `requester.name` | `requester.name` from config, fallback git committer |
| `requester.email` | `requester.email` from config, fallback git committer |

---

## GitHub Actions Workflow

The template includes `.github/workflows/publish-registry.yml` that automates publishing.

### Triggers

- **Push to main**: When `deco.json`, `app.json`, or `README.md` changes
- **Manual dispatch**: With optional `dry_run` flag

### Setup

#### For the public deco store (default)

No secrets needed. Just push to main.

#### For a private org store

1. Get the **publish URL** from Studio (see "Getting the Publish URL" above)
2. Go to your GitHub repo **Settings > Secrets and variables > Actions**
3. Add secret `PUBLISH_URL` with the URL you copied from Studio
4. If the org has **Require API Token** enabled:
   - Generate a token in Studio (see "Getting an API Token" above)
   - Add secret `PUBLISH_API_KEY` with the generated token

### Manual Publish

1. Go to **Actions > Publish to Registry**
2. Click **Run workflow**
3. Optionally check **Dry run** to preview the payload without publishing

### Manual curl

```bash
# Public deco store (no token needed)
curl -X POST https://studio.decocms.com/org/deco/registry/publish-request \
  -H "Content-Type: application/json" \
  -d @payload.json

# Private org store (with token)
curl -X POST <publish-url-from-studio> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-key>" \
  -d @payload.json
```

---

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| **201** | Publish request created (status: "pending") | Wait for review |
| **400** | Invalid payload (schema validation failed) | Check `deco.json` fields, especially `short_description` (max 160) and `readme` (max 50,000) |
| **401** | Missing or invalid API key | The org has **Require API Token** enabled. Generate a key in Studio and add it as `PUBLISH_API_KEY` secret. |
| **403** | Publish requests not enabled | The **Publish Requests** toggle is disabled in the org's Studio settings |
| **404** | Organization not found | Check `PUBLISH_URL` — the org slug must exist |
| **409** | ID or title conflict | An app with the same `scopeName/name` or `friendlyName` already exists as an approved registry item |
| **429** | Rate limited | Too many requests. Wait and retry (check the rate limit settings in Studio) |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Workflow doesn't trigger | Check that `deco.json` or `app.json` was changed in the push to `main` |
| 400 "Invalid publish request payload" | Validate your config: `short_description` max 160 chars, `readme` max 50,000 chars, `requester.email` must be valid email format |
| 401 "API key required" | The org has **Require API Token** enabled in Studio. Generate a key and add it as `PUBLISH_API_KEY` repo secret. |
| 401 "Invalid API key" | The token is wrong or was revoked. Generate a new one in Studio. |
| 403 "Publish requests are not enabled" | The **Publish Requests** toggle is off in Studio. Ask the org admin to enable it at `https://studio.decocms.com/{org-slug}/settings/store/registry`. |
| 409 "same id or title already exists" | Change `name` or `friendlyName` to avoid collision with existing approved apps |
| 429 "Too many publish requests" | Wait for the rate limit window to reset (check settings in Studio) |
| No email after submitting | Check `requester.email` in your config is correct. Review may take time. |
| App approved but not visible in store | Check if `unlisted: true` is set — this hides the app from listings even after approval |

---

## Quick Checklist

1. Rename `app.json` to `deco.json` (or keep `app.json` — both work)
2. Fill in required fields: `scopeName`, `name`
3. Fill in recommended fields: `friendlyName`, `description`, `icon`
4. Add `requester` with `name`, `email`, and `repository`
5. Set `connection.url` to your production MCP server URL
6. Add `metadata` with `categories`, `tags`, `short_description`
7. Write a good `README.md` (used as the store readme, max 50,000 chars)
8. Set `unlisted: false` if you want the app visible in store search
9. For private org stores: get the publish URL and optional API token from Studio
10. Push to `main` — the workflow publishes automatically
11. Wait for email from deco team with approval/rejection/adjustments
