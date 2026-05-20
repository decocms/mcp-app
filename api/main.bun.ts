import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "./app.ts";

const getClientHTML = () =>
	readFile(join(import.meta.dir, "..", "dist", "client", "index.html"), "utf-8");

const app = createApp(getClientHTML);

const PORT = Number(process.env.PORT) || 3001;

Bun.serve({
	idleTimeout: 0,
	hostname: "0.0.0.0",
	port: PORT,
	fetch: app.fetch,
});

const slug = process.env.WORKTREE_SLUG;
const baseUrl = slug ? `http://${slug}.localhost` : `http://localhost:${PORT}`;

console.log("");
console.log(`MCP App: ${baseUrl}/api/mcp`);
console.log("");
