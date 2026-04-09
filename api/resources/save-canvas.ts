import { createPublicResource } from "@decocms/runtime/tools";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { store } from "../storage/index.ts";
import { CANVAS_STORE_KEY } from "../tools/lean-canvas.ts";
import type { Env } from "../types/env.ts";

/**
 * Resource template that saves the canvas state via the MCP protocol.
 * The UI calls readServerResource({ uri: "data://mcp-app/save-canvas/<encoded-json>" })
 * to persist manual edits back to the store.
 */
export const saveCanvasResource = (_env: Env) =>
	createPublicResource({
		uri: new ResourceTemplate("data://mcp-app/save-canvas/{data}", {
			list: undefined,
		}) as unknown as string,
		name: "Save Canvas State",
		description:
			"Saves the current canvas state from the UI (manual edits, additions, deletions)",
		mimeType: "application/json",
		read: async ({ uri }) => {
			const uriStr = uri.toString();
			const marker = "/save-canvas/";
			const idx = uriStr.indexOf(marker);
			if (idx !== -1) {
				const encoded = uriStr.slice(idx + marker.length);
				if (encoded) {
					const canvasData = JSON.parse(decodeURIComponent(encoded));
					await store.set(CANVAS_STORE_KEY, canvasData);
				}
			}

			const current = await store.get(CANVAS_STORE_KEY);
			return {
				uri: "data://mcp-app/save-canvas",
				mimeType: "application/json",
				text: JSON.stringify(current ?? null),
			};
		},
	});
