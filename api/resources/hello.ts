import { createPublicResource } from "@decocms/runtime/tools";
import { HELLO_RESOURCE_URI } from "../tools/hello.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

export function makeHelloAppResource(getClientHTML: () => Promise<string>) {
	return (_env: Env) =>
		createPublicResource({
			uri: HELLO_RESOURCE_URI,
			name: "Hello UI",
			description: "Interactive greeting display powered by MCP Apps",
			mimeType: RESOURCE_MIME_TYPE,
			read: async () => {
				const html = await getClientHTML();
				return {
					uri: HELLO_RESOURCE_URI,
					mimeType: RESOURCE_MIME_TYPE,
					text: html,
				};
			},
		});
}
