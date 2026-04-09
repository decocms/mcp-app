import type { App } from "@modelcontextprotocol/ext-apps/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LeanCanvasOutput } from "../../../api/tools/lean-canvas.ts";

const POLL_INTERVAL = 2000;
const CANVAS_STATE_URI = "data://mcp-app/canvas-state";

const SECTION_KEYS = [
	"problem",
	"customerSegments",
	"uniqueValueProposition",
	"solution",
	"channels",
	"revenueStreams",
	"costStructure",
	"keyMetrics",
	"unfairAdvantage",
] as const;

function hasAnySectionFilled(data: Record<string, unknown>): boolean {
	return SECTION_KEYS.some((key) => {
		const section = data[key];
		return (
			section &&
			typeof section === "object" &&
			"items" in section &&
			Array.isArray((section as { items: unknown[] }).items) &&
			(section as { items: unknown[] }).items.length > 0
		);
	});
}

/**
 * Polls the canvas state via the MCP protocol (readServerResource).
 * This works regardless of the network context (tunnel, localhost, etc.)
 * because it goes through the MCP host ↔ server connection.
 */
export function useCanvasPolling(app: App | null) {
	const [canvas, setCanvas] = useState<LeanCanvasOutput | null>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const poll = useCallback(async () => {
		if (!app) {
			console.log("[Polling] No app instance yet");
			return;
		}
		try {
			console.log("[Polling] Reading resource...");
			const result = await app.readServerResource({
				uri: CANVAS_STATE_URI,
			});
			console.log("[Polling] Got result:", result);
			const content = result.contents[0];
			if (content && "text" in content && content.text) {
				const data = JSON.parse(content.text);
				if (data && hasAnySectionFilled(data)) {
					console.log("[Polling] Canvas updated:", data.projectName);
					setCanvas(data as LeanCanvasOutput);
				}
			}
		} catch (err) {
			console.log("[Polling] Error:", err);
		}
	}, [app]);

	useEffect(() => {
		if (!app) return;
		poll();
		intervalRef.current = setInterval(poll, POLL_INTERVAL);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [app, poll]);

	return canvas;
}
