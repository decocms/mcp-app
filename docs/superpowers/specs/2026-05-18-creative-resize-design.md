# creative_resize — MCP Tool Design

**Date:** 2026-05-18  
**Status:** Approved

## Overview

An MCP app tool that takes a base creative asset (image or PDF) and generates adapted versions for multiple platform formats using OpenRouter + GPT-image-1. Built for Baggagio as a demo/POC.

## Architecture

```
Claude Desktop (Studio host)
  → opens MCP resource → serves React UI
  → user drag-drops file
  → POST /api/creative-resize/generate (base64 + target formats)
  → API calls OpenRouter in parallel (one request per format)
  → streams results back via SSE
  → UI updates skeletons → images → download
```

## MCP Tool

- **Tool ID:** `creative_resize`
- **Schema:** minimal (serves as entrypoint for the UI; no meaningful MCP input/output)
- **Resource:** `ui://mcp-app/creative-resize` → serves `dist/client/index.html`

## UI Components

### DropZone
- Dashed border square, centered
- Click or drag-drop to upload
- Accepts: image/*, application/pdf
- PDF → rendered to canvas via pdf.js (first page) → exported as PNG before API call

### AssetPreview
- Replaces DropZone once file is loaded
- Canvas-style: file fills the square, X button top-right to remove and return to DropZone

### FormatPicker
- `+` button → dropdown below it (multi-select)
- Preset formats listed (see below)
- "Custom format" option → inline width × height inputs → adds to selection
- Selected formats shown as chips/tags

### GenerateButton
- Disabled until asset + at least one format selected
- On click: sends POST to API, transitions result area to skeletons

### ResultGrid
- Appears to the right of the original asset
- One card per format: skeleton while loading → image when ready
- Each card: format name, dimensions, download button
- "Download all (ZIP)" button when all done

## Preset Formats

| Name | Dimensions | Prompt Hint |
|---|---|---|
| Instagram Feed | 1080×1080 | square 1:1, center main subject |
| Instagram Story | 1080×1920 | vertical 9:16, key elements in center third |
| Instagram Landscape | 1080×566 | horizontal 1.91:1 |
| Facebook Post | 1200×628 | horizontal 1.91:1, balanced |
| Facebook Story | 1080×1920 | vertical 9:16 |
| LinkedIn Post | 1200×628 | professional horizontal |
| LinkedIn Banner | 1584×396 | wide banner, spread elements horizontally |
| Twitter/X Post | 1600×900 | 16:9 widescreen, cinematic |
| Pinterest | 1000×1500 | tall 2:3 vertical, visual hierarchy |
| Display 300×250 | 300×250 | compact rectangle |
| Leaderboard | 728×90 | ultra-wide horizontal strip |

## API Endpoint

`POST /api/creative-resize/generate`

Request:
```json
{
  "image": "<base64 PNG>",
  "formats": [
    { "name": "Instagram Story", "width": 1080, "height": 1920, "promptHint": "..." }
  ]
}
```

Response: SSE stream, one event per format as it completes:
```json
{ "name": "Instagram Story", "dataUrl": "data:image/png;base64,..." }
```

## OpenRouter Integration

- Base URL: `https://openrouter.ai/api/v1`
- Model: `openai/gpt-image-1`
- API key from env var: `OPENROUTER_API_KEY`
- One parallel request per format
- Each request: image edit with prompt = format hint + base instruction

Base prompt template:
> "Recompose this creative asset for [NAME] format ([W]×[H]px, [RATIO]). [HINT]. Keep brand colors, typography, and key visual elements. Output dimensions: [W]×[H]."

## File Structure

```
api/
  tools/creative-resize.ts       # MCP tool definition
  tools/index.ts                 # register tool
  resources/creative-resize.ts   # serves HTML bundle
  routes/creative-resize.ts      # POST /api/creative-resize/generate
  app.ts                         # register route

web/tools/creative-resize/
  index.tsx                      # page component (root)
  DropZone.tsx
  AssetPreview.tsx
  FormatPicker.tsx
  ResultGrid.tsx

web/router.tsx                   # register TOOL_PAGES entry
```

## Error Handling

- OpenRouter failures per format: show error state on that card (retry button)
- File too large: client-side validation before upload (max 20MB)
- PDF render failure: surface error in DropZone, prompt to upload as image instead

## Out of Scope (POC)

- Multi-page PDF support (only first page)
- Custom prompt editing by user
- Saving/history of generations
- Authentication
