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
