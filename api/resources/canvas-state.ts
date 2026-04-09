import { createPublicResource } from "@decocms/runtime/tools";
import { store } from "../storage/index.ts";
import {
	CANVAS_STATE_RESOURCE_URI,
	CANVAS_STORE_KEY,
} from "../tools/lean-canvas.ts";
import type { Env } from "../types/env.ts";

export const canvasStateResource = (_env: Env) =>
	createPublicResource({
		uri: CANVAS_STATE_RESOURCE_URI,
		name: "Lean Canvas State",
		description:
			"Current Lean Canvas state as JSON, read by the side panel UI via polling",
		mimeType: "application/json",
		read: async () => {
			const data = await store.get(CANVAS_STORE_KEY);
			return {
				uri: CANVAS_STATE_RESOURCE_URI,
				mimeType: "application/json",
				text: JSON.stringify(data ?? null),
			};
		},
	});
