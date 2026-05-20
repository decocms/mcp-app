import { createPublicResource } from "@decocms/runtime/tools";
import { CREATIVE_RESIZE_RESOURCE_URI } from "../tools/creative-resize.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

export function makeCreativeResizeAppResource(
	getClientHTML: () => Promise<string>,
) {
	return (_env: Env) =>
		createPublicResource({
			uri: CREATIVE_RESIZE_RESOURCE_URI,
			name: "Creative Resize UI",
			description: "Resize and adapt brand assets to multiple platform formats",
			mimeType: RESOURCE_MIME_TYPE,
			read: async () => {
				const html = await getClientHTML();
				return {
					uri: CREATIVE_RESIZE_RESOURCE_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: html,
				};
			},
		});
}
