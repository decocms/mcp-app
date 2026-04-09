import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicResource } from "@decocms/runtime/tools";
import { LEAN_CANVAS_RESOURCE_URI } from "../tools/lean-canvas.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

function getDistPath(): string {
	const IS_PRODUCTION = process.env.NODE_ENV === "production";
	const projectRoot = join(import.meta.dir, IS_PRODUCTION ? "../.." : "../..");
	return join(projectRoot, "dist", "client", "index.html");
}

export const leanCanvasAppResource = (_env: Env) =>
	createPublicResource({
		uri: LEAN_CANVAS_RESOURCE_URI,
		name: "Lean Canvas UI",
		description: "Construtor interativo de Lean Canvas powered by MCP Apps",
		mimeType: RESOURCE_MIME_TYPE,
		read: async () => {
			const html = await readFile(getDistPath(), "utf-8");
			return {
				uri: LEAN_CANVAS_RESOURCE_URI,
				mimeType: RESOURCE_MIME_TYPE,
				text: html,
			};
		},
	});
