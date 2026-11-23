import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicResource } from "@decocms/runtime/tools";
import { HELLO_RESOURCE_URI } from "../tools/hello.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

// The one UI bundle (`bun run build:web`). Two levels up from both
// api/resources/ (dev) and dist/server/ (the built server) is the repo root.
const BUNDLE = join(import.meta.dirname, "../../dist/client/index.html");

export const helloAppResource = (_env: Env) =>
	createPublicResource({
		uri: HELLO_RESOURCE_URI,
		name: "Hello UI",
		description: "Interactive greeting display powered by MCP Apps",
		mimeType: RESOURCE_MIME_TYPE,
		read: async () => {
			const html = await readFile(BUNDLE, "utf-8");
			return {
				uri: HELLO_RESOURCE_URI,
				mimeType: RESOURCE_MIME_TYPE,
				text: html,
			};
		},
	});
