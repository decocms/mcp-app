# creative_resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MCP App tool that takes a base image/PDF and generates adapted versions for multiple platform formats using OpenRouter + GPT-image-1, with drag-drop upload, format picker, and bulk download.

**Architecture:** The MCP tool (`creative_resize`) is a thin entrypoint that opens the interactive React UI. All real work happens through a custom HTTP endpoint `POST /api/creative-resize/generate` on the Bun API server, which calls OpenRouter in parallel per format and streams results back via SSE.

**Tech Stack:** Bun, React 19, Tailwind CSS v4, shadcn/ui, `pdfjs-dist` (PDF→canvas in browser), `fflate` (client-side ZIP), OpenRouter API (`openai/gpt-image-1` image edits endpoint)

---

## File Map

**Create:**
- `api/tools/creative-resize.ts` — MCP tool definition (minimal schema, opens UI)
- `api/resources/creative-resize.ts` — MCP resource serving the HTML bundle
- `api/routes/creative-resize.ts` — `POST /api/creative-resize/generate` handler + OpenRouter calls + SSE streaming
- `web/tools/creative-resize/formats.ts` — preset format list with prompt hints
- `web/tools/creative-resize/DropZone.tsx` — dashed square, drag-drop + click-to-upload, PDF handling
- `web/tools/creative-resize/AssetPreview.tsx` — uploaded asset with X button
- `web/tools/creative-resize/FormatPicker.tsx` — `+` button, dropdown, multi-select chips, custom format input
- `web/tools/creative-resize/ResultGrid.tsx` — skeleton cards → image cards with per-item and bulk download
- `web/tools/creative-resize/index.tsx` — main page, state orchestration

**Modify:**
- `api/tools/index.ts` — register `creativeResizeTool`
- `api/app.ts` — register `creativeResizeAppResource` + `withCreativeResizeRoute` middleware
- `web/router.tsx` — register `CreativeResizePage` in `TOOL_PAGES`

---

## Task 1: Install dependencies

**Files:** `package.json`, `bun.lock`

- [ ] **Step 1: Install pdfjs-dist and fflate**

```bash
cd /Users/rafaelvalls/conductor/workspaces/mcp-app-v1/tianjin
bun add pdfjs-dist fflate
```

Expected: both packages appear in `package.json` dependencies.

- [ ] **Step 2: Verify TypeScript can see the types**

```bash
bun run check
```

Expected: no new errors (types ship with both packages).

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "feat: add pdfjs-dist and fflate dependencies"
```

---

## Task 2: API route — pure functions + tests

The format mapping logic is pure and testable before wiring anything up.

**Files:**
- Create: `api/routes/creative-resize.ts`
- Create: `api/routes/creative-resize.test.ts`

- [ ] **Step 1: Write failing tests**

Create `api/routes/creative-resize.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { buildPrompt, mapToSupportedSize } from "./creative-resize.ts";

describe("mapToSupportedSize", () => {
	it("maps square formats to 1024x1024", () => {
		expect(mapToSupportedSize(1080, 1080)).toBe("1024x1024");
	});

	it("maps landscape formats to 1536x1024", () => {
		expect(mapToSupportedSize(1200, 628)).toBe("1536x1024");
		expect(mapToSupportedSize(1600, 900)).toBe("1536x1024");
	});

	it("maps portrait formats to 1024x1536", () => {
		expect(mapToSupportedSize(1080, 1920)).toBe("1024x1536");
		expect(mapToSupportedSize(1000, 1500)).toBe("1024x1536");
	});
});

describe("buildPrompt", () => {
	it("includes format name and dimensions", () => {
		const prompt = buildPrompt({
			name: "Instagram Story",
			width: 1080,
			height: 1920,
			promptHint: "vertical 9:16 story",
		});
		expect(prompt).toContain("Instagram Story");
		expect(prompt).toContain("1080×1920");
		expect(prompt).toContain("vertical 9:16 story");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test api/routes/creative-resize.test.ts
```

Expected: FAIL — `creative-resize.ts` not found.

- [ ] **Step 3: Implement the route file**

Create `api/routes/creative-resize.ts`:

```typescript
export interface FormatRequest {
	name: string;
	width: number;
	height: number;
	promptHint: string;
}

interface GenerateBody {
	image: string; // base64 PNG
	formats: FormatRequest[];
}

type SupportedSize = "1024x1024" | "1536x1024" | "1024x1536";

export function mapToSupportedSize(width: number, height: number): SupportedSize {
	const ratio = width / height;
	if (ratio > 1.2) return "1536x1024";
	if (ratio < 0.8) return "1024x1536";
	return "1024x1024";
}

export function buildPrompt(format: FormatRequest): string {
	return `Recompose this creative asset for ${format.name} format (${format.width}×${format.height}px). ${format.promptHint}. Maintain brand colors, typography, and key visual elements. Output must look professional and polished.`;
}

async function generateFormat(
	imageBase64: string,
	format: FormatRequest,
	apiKey: string,
): Promise<string> {
	const imageBytes = Buffer.from(imageBase64, "base64");
	const blob = new Blob([imageBytes], { type: "image/png" });

	const formData = new FormData();
	formData.append("model", "openai/gpt-image-1");
	formData.append("image", blob, "image.png");
	formData.append("prompt", buildPrompt(format));
	formData.append("size", mapToSupportedSize(format.width, format.height));
	formData.append("response_format", "b64_json");
	formData.append("n", "1");

	const res = await fetch("https://openrouter.ai/api/v1/images/edits", {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}` },
		body: formData,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OpenRouter error ${res.status}: ${text}`);
	}

	const data = (await res.json()) as { data: Array<{ b64_json: string }> };
	return data.data[0].b64_json;
}

// biome-ignore lint/suspicious/noExplicitAny: runtime middleware signature
type Fetcher = (req: Request, ...args: any[]) => Response | Promise<Response>;

export function withCreativeResizeRoute(fetcher: Fetcher): Fetcher {
	return async (req: Request, ...args) => {
		const url = new URL(req.url);

		if (req.method === "OPTIONS" && url.pathname === "/api/creative-resize/generate") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		if (req.method !== "POST" || url.pathname !== "/api/creative-resize/generate") {
			return fetcher(req, ...args);
		}

		const apiKey = process.env.OPENROUTER_API_KEY;
		if (!apiKey) {
			return new Response(
				JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		let body: GenerateBody;
		try {
			body = (await req.json()) as GenerateBody;
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { image, formats } = body;

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				const send = (data: object) => {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
					);
				};

				await Promise.all(
					formats.map(async (format) => {
						try {
							const b64Json = await generateFormat(image, format, apiKey);
							send({ name: format.name, b64Json, status: "done" });
						} catch (e) {
							send({ name: format.name, status: "error", error: String(e) });
						}
					}),
				);

				controller.close();
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		});
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test api/routes/creative-resize.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add api/routes/creative-resize.ts api/routes/creative-resize.test.ts
git commit -m "feat: add creative-resize route handler with OpenRouter SSE streaming"
```

---

## Task 3: MCP tool + resource

**Files:**
- Create: `api/tools/creative-resize.ts`
- Create: `api/resources/creative-resize.ts`
- Modify: `api/tools/index.ts`
- Modify: `api/app.ts`

- [ ] **Step 1: Create the MCP tool**

Create `api/tools/creative-resize.ts`:

```typescript
import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import type { Env } from "../types/env.ts";

export const CREATIVE_RESIZE_RESOURCE_URI = "ui://mcp-app/creative-resize";

const outputSchema = z.object({ status: z.literal("ready") });

export type CreativeResizeOutput = z.infer<typeof outputSchema>;

export const creativeResizeTool = (_env: Env) =>
	createTool({
		id: "creative_resize",
		description:
			"Open the Creative Resize tool. Upload a brand asset (image or PDF) and generate adapted versions for all major social media and advertising formats in bulk.",
		inputSchema: z.object({}),
		outputSchema,
		_meta: { ui: { resourceUri: CREATIVE_RESIZE_RESOURCE_URI } },
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		execute: async () => ({ status: "ready" as const }),
	});
```

- [ ] **Step 2: Create the MCP resource**

Create `api/resources/creative-resize.ts`:

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicResource } from "@decocms/runtime/tools";
import { CREATIVE_RESIZE_RESOURCE_URI } from "../tools/creative-resize.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

function getDistPath(): string {
	const IS_PRODUCTION = process.env.NODE_ENV === "production";
	const projectRoot = join(import.meta.dir, IS_PRODUCTION ? "../.." : "../..");
	return join(projectRoot, "dist", "client", "index.html");
}

export const creativeResizeAppResource = (_env: Env) =>
	createPublicResource({
		uri: CREATIVE_RESIZE_RESOURCE_URI,
		name: "Creative Resize UI",
		description: "Resize and adapt brand assets to multiple platform formats",
		mimeType: RESOURCE_MIME_TYPE,
		read: async () => {
			const html = await readFile(getDistPath(), "utf-8");
			return {
				uri: CREATIVE_RESIZE_RESOURCE_URI,
				mimeType: RESOURCE_MIME_TYPE,
				text: html,
			};
		},
	});
```

- [ ] **Step 3: Register the tool**

Edit `api/tools/index.ts`:

```typescript
import { creativeResizeTool } from "./creative-resize.ts";
import { helloTool } from "./hello.ts";

export const tools = [helloTool, creativeResizeTool];
```

- [ ] **Step 4: Wire resource and route into app.ts**

Edit `api/app.ts` — add two imports after the existing ones, then update the runtime config and the export:

```typescript
import { withRuntime } from "@decocms/runtime";
import { prompts } from "./prompts/index.ts";
import { creativeResizeAppResource } from "./resources/creative-resize.ts";
import { helloAppResource } from "./resources/hello.ts";
import { withCreativeResizeRoute } from "./routes/creative-resize.ts";
import { tools } from "./tools/index.ts";
import { type Env, StateSchema } from "./types/env.ts";
```

In the runtime config, add `creativeResizeAppResource` to the resources array:

```typescript
const runtime = withRuntime<Env, typeof StateSchema>({
	configuration: {
		state: StateSchema,
	},
	tools,
	prompts,
	resources: [helloAppResource, creativeResizeAppResource],
});
```

Update the app export to wrap with the new route middleware:

```typescript
export const app = {
	fetch: withLogging(withCreativeResizeRoute(withMcpApiRoute(runtime.fetch))),
};
```

- [ ] **Step 5: Type-check**

```bash
bun run check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add api/tools/creative-resize.ts api/resources/creative-resize.ts api/tools/index.ts api/app.ts
git commit -m "feat: register creative_resize MCP tool and resource"
```

---

## Task 4: Format presets

**Files:**
- Create: `web/tools/creative-resize/formats.ts`

- [ ] **Step 1: Create the formats file**

Create `web/tools/creative-resize/formats.ts`:

```typescript
export interface PresetFormat {
	name: string;
	width: number;
	height: number;
	promptHint: string;
	category: string;
}

export const PRESET_FORMATS: PresetFormat[] = [
	{
		name: "Instagram Feed",
		width: 1080,
		height: 1080,
		promptHint: "square 1:1 format, center the main subject, balanced composition",
		category: "Instagram",
	},
	{
		name: "Instagram Story",
		width: 1080,
		height: 1920,
		promptHint:
			"vertical 9:16 story format, keep key elements in the center third, leave safe zones top and bottom",
		category: "Instagram",
	},
	{
		name: "Instagram Landscape",
		width: 1080,
		height: 566,
		promptHint:
			"horizontal 1.91:1 landscape format, spread elements across the width",
		category: "Instagram",
	},
	{
		name: "Facebook Post",
		width: 1200,
		height: 628,
		promptHint: "horizontal 1.91:1 Facebook post, balanced and bold composition",
		category: "Facebook",
	},
	{
		name: "Facebook Story",
		width: 1080,
		height: 1920,
		promptHint:
			"vertical 9:16 Facebook story, full-bleed composition with safe zones",
		category: "Facebook",
	},
	{
		name: "LinkedIn Post",
		width: 1200,
		height: 628,
		promptHint:
			"professional horizontal 1.91:1 format, clean and corporate aesthetic",
		category: "LinkedIn",
	},
	{
		name: "LinkedIn Banner",
		width: 1584,
		height: 396,
		promptHint:
			"ultra-wide 4:1 banner, spread elements horizontally, text on left or center",
		category: "LinkedIn",
	},
	{
		name: "Twitter/X Post",
		width: 1600,
		height: 900,
		promptHint: "widescreen 16:9 format, cinematic horizontal composition",
		category: "Twitter/X",
	},
	{
		name: "Pinterest",
		width: 1000,
		height: 1500,
		promptHint:
			"tall 2:3 vertical format, strong visual hierarchy from top to bottom",
		category: "Pinterest",
	},
	{
		name: "Display 300×250",
		width: 300,
		height: 250,
		promptHint: "compact 6:5 display ad, clear focal point, minimal text",
		category: "Display",
	},
	{
		name: "Leaderboard 728×90",
		width: 728,
		height: 90,
		promptHint:
			"ultra-wide horizontal banner, logo left, key message center, CTA right",
		category: "Display",
	},
];
```

- [ ] **Step 2: Commit**

```bash
git add web/tools/creative-resize/formats.ts
git commit -m "feat: add creative-resize preset format list"
```

---

## Task 5: DropZone component

**Files:**
- Create: `web/tools/creative-resize/DropZone.tsx`

- [ ] **Step 1: Create DropZone**

Create `web/tools/creative-resize/DropZone.tsx`:

```tsx
import { cn } from "@/lib/utils.ts";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useRef, useState } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

interface DropZoneProps {
	onFile: (base64: string, fileName: string) => void;
}

async function fileToBase64(file: File): Promise<string> {
	if (file.type === "application/pdf") {
		return pdfToBase64(file);
	}
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(",")[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

async function pdfToBase64(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const page = await pdf.getPage(1);
	const viewport = page.getViewport({ scale: 2 });
	const canvas = document.createElement("canvas");
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get canvas context");
	await page.render({ canvasContext: ctx, viewport }).promise;
	return canvas.toDataURL("image/png").split(",")[1];
}

export function DropZone({ onFile }: DropZoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(
		async (file: File) => {
			const valid = file.type.startsWith("image/") || file.type === "application/pdf";
			if (!valid) {
				setError("Only images and PDFs are supported.");
				return;
			}
			if (file.size > 20 * 1024 * 1024) {
				setError("File must be under 20MB.");
				return;
			}
			setError(null);
			setLoading(true);
			try {
				const base64 = await fileToBase64(file);
				onFile(base64, file.name);
			} catch {
				setError("Failed to read file. Please try again.");
			} finally {
				setLoading(false);
			}
		},
		[onFile],
	);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const onInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	return (
		<div
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={onDrop}
			className={cn(
				"w-64 h-64 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer select-none transition-colors",
				isDragging
					? "border-primary bg-primary/5"
					: "border-border hover:border-primary/50 hover:bg-muted/30",
			)}
		>
			<input
				ref={inputRef}
				type="file"
				accept="image/*,application/pdf"
				className="hidden"
				onChange={onInputChange}
			/>
			{loading ? (
				<span className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
			) : (
				<>
					<svg
						className="w-10 h-10 text-muted-foreground"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<div className="text-center">
						<p className="text-sm font-medium">Drop file here</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Image or PDF · up to 20MB
						</p>
					</div>
				</>
			)}
			{error ? (
				<p className="text-xs text-destructive text-center px-4">{error}</p>
			) : null}
		</div>
	);
}
```

- [ ] **Step 2: Type-check**

```bash
bun run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/tools/creative-resize/DropZone.tsx
git commit -m "feat: add DropZone component with PDF and image support"
```

---

## Task 6: AssetPreview component

**Files:**
- Create: `web/tools/creative-resize/AssetPreview.tsx`

- [ ] **Step 1: Create AssetPreview**

Create `web/tools/creative-resize/AssetPreview.tsx`:

```tsx
import { Button } from "@/components/ui/button.tsx";
import { X } from "lucide-react";

interface AssetPreviewProps {
	base64: string;
	fileName: string;
	onRemove: () => void;
}

export function AssetPreview({ base64, fileName, onRemove }: AssetPreviewProps) {
	return (
		<div className="relative w-64 h-64 rounded-xl overflow-hidden border border-border">
			<img
				src={`data:image/png;base64,${base64}`}
				alt={fileName}
				className="w-full h-full object-contain bg-muted/20"
			/>
			<Button
				size="icon"
				variant="secondary"
				onClick={onRemove}
				className="absolute top-2 right-2 h-7 w-7 rounded-full shadow"
			>
				<X className="w-3.5 h-3.5" />
			</Button>
			<div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-3 py-1.5">
				<p className="text-xs text-muted-foreground truncate">{fileName}</p>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/tools/creative-resize/AssetPreview.tsx
git commit -m "feat: add AssetPreview component"
```

---

## Task 7: FormatPicker component

**Files:**
- Create: `web/tools/creative-resize/FormatPicker.tsx`

- [ ] **Step 1: Create FormatPicker**

Create `web/tools/creative-resize/FormatPicker.tsx`:

```tsx
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PresetFormat } from "./formats.ts";
import { PRESET_FORMATS } from "./formats.ts";

export interface SelectedFormat {
	name: string;
	width: number;
	height: number;
	promptHint: string;
}

interface FormatPickerProps {
	selected: SelectedFormat[];
	onChange: (formats: SelectedFormat[]) => void;
}

const CATEGORIES = Array.from(new Set(PRESET_FORMATS.map((f) => f.category)));

export function FormatPicker({ selected, onChange }: FormatPickerProps) {
	const [open, setOpen] = useState(false);
	const [customWidth, setCustomWidth] = useState("");
	const [customHeight, setCustomHeight] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function onClickOutside(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	const isSelected = useCallback(
		(format: PresetFormat) =>
			selected.some((s) => s.name === format.name),
		[selected],
	);

	const toggle = useCallback(
		(format: PresetFormat) => {
			if (isSelected(format)) {
				onChange(selected.filter((s) => s.name !== format.name));
			} else {
				onChange([...selected, format]);
			}
		},
		[selected, onChange, isSelected],
	);

	const addCustom = useCallback(() => {
		const w = Number.parseInt(customWidth, 10);
		const h = Number.parseInt(customHeight, 10);
		if (!w || !h || w <= 0 || h <= 0) return;
		const name = `Custom ${w}×${h}`;
		if (selected.some((s) => s.name === name)) return;
		onChange([
			...selected,
			{
				name,
				width: w,
				height: h,
				promptHint: `custom ${w}×${h}px format, balanced composition`,
			},
		]);
		setCustomWidth("");
		setCustomHeight("");
	}, [customWidth, customHeight, selected, onChange]);

	const remove = useCallback(
		(name: string) => onChange(selected.filter((s) => s.name !== name)),
		[selected, onChange],
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="relative" ref={dropdownRef}>
				<Button
					size="sm"
					variant="outline"
					onClick={() => setOpen((o) => !o)}
					className="gap-1.5"
				>
					<Plus className="w-3.5 h-3.5" />
					Add format
				</Button>

				{open && (
					<div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
						<div className="max-h-80 overflow-y-auto">
							{CATEGORIES.map((category) => (
								<div key={category}>
									<p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
										{category}
									</p>
									{PRESET_FORMATS.filter((f) => f.category === category).map(
										(format) => (
											<button
												key={format.name}
												type="button"
												onClick={() => toggle(format)}
												className={cn(
													"w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
													isSelected(format) && "bg-primary/5 text-primary",
												)}
											>
												<span>{format.name}</span>
												<span className="text-xs text-muted-foreground">
													{format.width}×{format.height}
												</span>
											</button>
										),
									)}
								</div>
							))}
						</div>
						<div className="border-t border-border p-3">
							<p className="text-xs font-medium mb-2">Custom size</p>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="Width"
									value={customWidth}
									onChange={(e) => setCustomWidth(e.target.value)}
									className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<span className="text-muted-foreground">×</span>
								<input
									type="number"
									placeholder="Height"
									value={customHeight}
									onChange={(e) => setCustomHeight(e.target.value)}
									className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<Button size="sm" onClick={addCustom} disabled={!customWidth || !customHeight}>
									Add
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>

			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selected.map((format) => (
						<span
							key={format.name}
							className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
						>
							{format.name}
							<button
								type="button"
								onClick={() => remove(format.name)}
								className="hover:text-primary/60 transition-colors"
							>
								<X className="w-3 h-3" />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Type-check**

```bash
bun run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/tools/creative-resize/FormatPicker.tsx
git commit -m "feat: add FormatPicker component with presets and custom format input"
```

---

## Task 8: ResultGrid component

**Files:**
- Create: `web/tools/creative-resize/ResultGrid.tsx`

- [ ] **Step 1: Create ResultGrid**

Create `web/tools/creative-resize/ResultGrid.tsx`:

```tsx
import { Button } from "@/components/ui/button.tsx";
import { zip } from "fflate";
import { Download } from "lucide-react";
import { useCallback } from "react";

export type FormatResultStatus = "pending" | "done" | "error";

export interface FormatResult {
	name: string;
	width: number;
	height: number;
	status: FormatResultStatus;
	b64Json?: string;
	error?: string;
}

interface ResultGridProps {
	results: FormatResult[];
}

function downloadOne(result: FormatResult) {
	if (!result.b64Json) return;
	const link = document.createElement("a");
	link.href = `data:image/png;base64,${result.b64Json}`;
	link.download = `${result.name.replace(/\s+/g, "_")}.png`;
	link.click();
}

function downloadAll(results: FormatResult[]) {
	const done = results.filter((r) => r.status === "done" && r.b64Json);
	if (done.length === 0) return;

	const files: Record<string, Uint8Array> = {};
	for (const result of done) {
		const binary = atob(result.b64Json!);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		files[`${result.name.replace(/\s+/g, "_")}.png`] = bytes;
	}

	zip(files, (err, data) => {
		if (err) return;
		const blob = new Blob([data], { type: "application/zip" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "creative-formats.zip";
		link.click();
		URL.revokeObjectURL(url);
	});
}

function ResultCard({ result }: { result: FormatResult }) {
	if (result.status === "pending") {
		return (
			<div className="rounded-xl border border-border overflow-hidden">
				<div className="aspect-square bg-muted animate-pulse" />
				<div className="p-2.5 space-y-1.5">
					<div className="h-3 bg-muted animate-pulse rounded w-3/4" />
					<div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
				</div>
			</div>
		);
	}

	if (result.status === "error") {
		return (
			<div className="rounded-xl border border-destructive/50 overflow-hidden">
				<div className="aspect-square bg-destructive/5 flex items-center justify-center">
					<p className="text-xs text-destructive text-center px-3">{result.error ?? "Generation failed"}</p>
				</div>
				<div className="p-2.5">
					<p className="text-xs font-medium truncate">{result.name}</p>
					<p className="text-xs text-muted-foreground">
						{result.width}×{result.height}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border overflow-hidden group">
			<div className="aspect-square bg-muted/20 relative">
				<img
					src={`data:image/png;base64,${result.b64Json}`}
					alt={result.name}
					className="w-full h-full object-contain"
				/>
				<button
					type="button"
					onClick={() => downloadOne(result)}
					className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
				>
					<Download className="w-5 h-5 text-white" />
				</button>
			</div>
			<div className="p-2.5 flex items-center justify-between">
				<div className="min-w-0">
					<p className="text-xs font-medium truncate">{result.name}</p>
					<p className="text-xs text-muted-foreground">
						{result.width}×{result.height}
					</p>
				</div>
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7 shrink-0"
					onClick={() => downloadOne(result)}
				>
					<Download className="w-3.5 h-3.5" />
				</Button>
			</div>
		</div>
	);
}

export function ResultGrid({ results }: ResultGridProps) {
	const allDone = results.every((r) => r.status !== "pending");
	const hasDone = results.some((r) => r.status === "done");

	const handleDownloadAll = useCallback(() => downloadAll(results), [results]);

	return (
		<div className="flex flex-col gap-4">
			{allDone && hasDone && (
				<div className="flex justify-end">
					<Button onClick={handleDownloadAll} className="gap-2">
						<Download className="w-4 h-4" />
						Download all (.zip)
					</Button>
				</div>
			)}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
				{results.map((result) => (
					<ResultCard key={result.name} result={result} />
				))}
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/tools/creative-resize/ResultGrid.tsx
git commit -m "feat: add ResultGrid component with skeleton states and ZIP download"
```

---

## Task 9: Main page + router wiring

**Files:**
- Create: `web/tools/creative-resize/index.tsx`
- Modify: `web/router.tsx`

- [ ] **Step 1: Create the main page**

Create `web/tools/creative-resize/index.tsx`:

```tsx
import { Button } from "@/components/ui/button.tsx";
import { useMcpState } from "@/context.tsx";
import { useState } from "react";
import type { CreativeResizeOutput } from "../../../api/tools/creative-resize.ts"; // exported in Task 3
import { AssetPreview } from "./AssetPreview.tsx";
import { DropZone } from "./DropZone.tsx";
import type { SelectedFormat } from "./FormatPicker.tsx";
import { FormatPicker } from "./FormatPicker.tsx";
import type { FormatResult } from "./ResultGrid.tsx";
import { ResultGrid } from "./ResultGrid.tsx";

export default function CreativeResizePage() {
	const state = useMcpState<Record<string, never>, CreativeResizeOutput>();
	const [imageBase64, setImageBase64] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string>("");
	const [selectedFormats, setSelectedFormats] = useState<SelectedFormat[]>([]);
	const [results, setResults] = useState<FormatResult[]>([]);
	const [generating, setGenerating] = useState(false);

	if (state.status === "initializing") {
		return (
			<div className="flex items-center justify-center min-h-dvh p-6">
				<div className="flex items-center gap-3 text-muted-foreground">
					<span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
					<span className="text-sm">Connecting to host...</span>
				</div>
			</div>
		);
	}

	async function generate() {
		if (!imageBase64 || selectedFormats.length === 0) return;
		setGenerating(true);

		const pending: FormatResult[] = selectedFormats.map((f) => ({
			name: f.name,
			width: f.width,
			height: f.height,
			status: "pending",
		}));
		setResults(pending);

		try {
			const response = await fetch("/api/creative-resize/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ image: imageBase64, formats: selectedFormats }),
			});

			if (!response.body) throw new Error("No response body");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					try {
						const event = JSON.parse(line.slice(6)) as {
							name: string;
							status: "done" | "error";
							b64Json?: string;
							error?: string;
						};
						setResults((prev) =>
							prev.map((r) =>
								r.name === event.name
									? {
											...r,
											status: event.status,
											b64Json: event.b64Json,
											error: event.error,
										}
									: r,
							),
						);
					} catch {
						// malformed SSE line, skip
					}
				}
			}
		} catch (e) {
			setResults((prev) =>
				prev.map((r) =>
					r.status === "pending"
						? { ...r, status: "error", error: String(e) }
						: r,
				),
			);
		} finally {
			setGenerating(false);
		}
	}

	return (
		<div className="min-h-dvh p-8 flex flex-col gap-8">
			<div>
				<h1 className="text-2xl font-semibold">Creative Resize</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Upload a brand asset and generate adapted versions for every platform.
				</p>
			</div>

			<div className="flex items-start gap-6 flex-wrap">
				{imageBase64 ? (
					<AssetPreview
						base64={imageBase64}
						fileName={fileName}
						onRemove={() => {
							setImageBase64(null);
							setFileName("");
							setResults([]);
						}}
					/>
				) : (
					<DropZone
						onFile={(b64, name) => {
							setImageBase64(b64);
							setFileName(name);
							setResults([]);
						}}
					/>
				)}

				<div className="flex flex-col gap-4">
					<FormatPicker
						selected={selectedFormats}
						onChange={setSelectedFormats}
					/>
					<Button
						onClick={generate}
						disabled={!imageBase64 || selectedFormats.length === 0 || generating}
						className="self-start"
					>
						{generating ? (
							<>
								<span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
								Generating…
							</>
						) : (
							"Generate"
						)}
					</Button>
				</div>
			</div>

			{results.length > 0 && <ResultGrid results={results} />}
		</div>
	);
}
```

- [ ] **Step 2: Register in router**

Edit `web/router.tsx` — add the import and register the page:

```typescript
import { createHashHistory } from "@tanstack/history";
import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { useMcpHostContext, useMcpState } from "./context.tsx";
import CreativeResizePage from "./tools/creative-resize/index.tsx";
import HelloPage from "./tools/hello/index.tsx";

const TOOL_PAGES: Record<string, React.ComponentType> = {
	hello_world: HelloPage,
	creative_resize: CreativeResizePage,
};
```

(Leave the rest of `web/router.tsx` unchanged.)

- [ ] **Step 3: Type-check**

```bash
bun run check
```

Expected: no errors.

- [ ] **Step 4: Build to verify the bundle compiles**

```bash
bun run build:web
```

Expected: exits with code 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add web/tools/creative-resize/index.tsx web/router.tsx api/tools/creative-resize.ts
git commit -m "feat: add CreativeResizePage and wire into router"
```

---

## Task 10: Smoke test the dev server

- [ ] **Step 1: Start dev server**

```bash
bun run dev:api &
```

Expected: server starts on port 3001.

- [ ] **Step 2: Verify the MCP endpoint responds**

```bash
curl -s http://localhost:3001/api/mcp -H "Accept: text/event-stream" | head -5
```

Expected: SSE handshake response (not a 404).

- [ ] **Step 3: Verify the generate route exists (missing API key returns 500, not 404)**

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/creative-resize/generate \
  -H "Content-Type: application/json" \
  -d '{"image":"test","formats":[]}'
```

Expected: `500` (OPENROUTER_API_KEY not set), NOT `404`.

- [ ] **Step 4: Stop the dev server and commit**

```bash
kill %1
git add -A
git commit -m "feat: creative_resize tool complete — ready for OpenRouter API key"
```

---

## Done

The tool is wired end-to-end. The user adds `OPENROUTER_API_KEY` to the environment and the generate flow is live. To test with a real API key:

```bash
OPENROUTER_API_KEY=sk-or-... bun run dev:api
```

Then open the `creative_resize` tool in Claude Desktop.
