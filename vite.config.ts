import { renameSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const TOOL = process.env.TOOL;
if (!TOOL) {
	throw new Error(
		"TOOL environment variable is not set. Usage: TOOL=hello vite build",
	);
}

/**
 * Renames the output HTML from index.html to <tool>.html so each tool
 * gets its own self-contained bundle in dist/client/.
 */
function renameHtml(toolName: string): Plugin {
	return {
		name: "rename-tool-html",
		closeBundle() {
			const outDir = path.resolve(__dirname, "dist/client");
			const src = path.join(outDir, "index.html");
			const dst = path.join(outDir, `${toolName}.html`);
			try {
				renameSync(src, dst);
			} catch {
				// File may not exist during watch rebuilds
			}
		},
	};
}

export default defineConfig({
	plugins: [react(), tailwindcss(), viteSingleFile(), renameHtml(TOOL)],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./web"),
			"@tool": path.resolve(__dirname, `./web/tools/${TOOL}`),
		},
	},
	build: {
		outDir: "dist/client",
		emptyOutDir: false,
		rollupOptions: {
			input: "index.html",
		},
	},
});
