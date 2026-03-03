import { join } from "node:path";
import { withRuntime } from "@decocms/runtime";
import { helloAppResource } from "./resources/hello.ts";
import { tools } from "./tools/index.ts";
import { type Env, StateSchema } from "./types/env.ts";

// biome-ignore lint/suspicious/noExplicitAny: runtime.fetch signature compatibility
type Fetcher = (req: Request, ...args: any[]) => Response | Promise<Response>;

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const PROJECT_ROOT = join(import.meta.dir, IS_PRODUCTION ? ".." : "..");
const DIST_CLIENT_DIR = join(PROJECT_ROOT, "dist", "client");

const colors = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	GET: "\x1b[36m",
	POST: "\x1b[33m",
	PUT: "\x1b[35m",
	DELETE: "\x1b[31m",
	ok: "\x1b[32m",
	redirect: "\x1b[36m",
	clientError: "\x1b[33m",
	serverError: "\x1b[31m",
	mcp: "\x1b[35m",
	duration: "\x1b[90m",
	requestId: "\x1b[94m",
};

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".css": "text/css",
	".js": "application/javascript",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

function getStatusColor(status: number): string {
	if (status >= 500) return colors.serverError;
	if (status >= 400) return colors.clientError;
	if (status >= 300) return colors.redirect;
	return colors.ok;
}

function getMethodColor(method: string): string {
	return colors[method as keyof typeof colors] || colors.reset;
}

function getContentType(filePath: string): string {
	const ext = filePath.slice(filePath.lastIndexOf("."));
	return MIME_TYPES[ext] ?? "application/octet-stream";
}

async function serveFile(
	baseDir: string,
	relativePath: string,
	headers?: HeadersInit,
): Promise<Response | null> {
	const safePath = relativePath.replace(/^\/+/, "");
	if (safePath.includes(".."))
		return new Response("Forbidden", { status: 403 });
	const filePath = join(baseDir, safePath);

	const file = Bun.file(filePath);
	if (!(await file.exists())) return null;

	return new Response(file, {
		headers: {
			"content-type": getContentType(filePath),
			...headers,
		},
	});
}

const runtime = withRuntime<Env, typeof StateSchema>({
	configuration: {
		state: StateSchema,
	},
	tools,
	resources: [helloAppResource],
});

function withLogging(fetcher: Fetcher): Fetcher {
	return async (req: Request, ...args) => {
		const start = performance.now();
		const method = req.method;
		const path = new URL(req.url).pathname;
		const requestId =
			req.headers.get("x-request-id") || crypto.randomUUID().slice(0, 8);

		const methodColor = getMethodColor(method);
		const reqIdStr = `${colors.requestId}${requestId.slice(0, 8)}${colors.reset}`;
		console.log(
			`${colors.dim}<-${colors.reset} ${methodColor}${method}${colors.reset} ${path} ${reqIdStr}`,
		);

		try {
			const response = await fetcher(req, ...args);
			const duration = (performance.now() - start).toFixed(1);
			const statusColor = getStatusColor(response.status);
			console.log(
				`${colors.dim}->${colors.reset} ${methodColor}${method}${colors.reset} ${path} ${reqIdStr} ${statusColor}${response.status}${colors.reset} ${colors.duration}${duration}ms${colors.reset}`,
			);
			return response;
		} catch (error) {
			const duration = (performance.now() - start).toFixed(1);
			console.log(
				`${colors.dim}->${colors.reset} ${methodColor}${method}${colors.reset} ${path} ${reqIdStr} ${colors.serverError}ERR${colors.reset} ${colors.duration}${duration}ms${colors.reset}`,
			);
			throw error;
		}
	};
}

function withMcpApiRoute(fetcher: Fetcher): Fetcher {
	return (req: Request, ...args) => {
		const url = new URL(req.url);

		if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
			return new Response("Not Found", { status: 404 });
		}

		if (url.pathname === "/api/mcp" || url.pathname.startsWith("/api/mcp/")) {
			url.pathname = url.pathname.slice(4);
			const rewrittenReq = new Request(url.toString(), req);
			return fetcher(rewrittenReq, ...args);
		}

		return fetcher(req, ...args);
	};
}

function withFrontend(fetcher: Fetcher): Fetcher {
	return async (req: Request, ...args) => {
		const url = new URL(req.url);
		if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
			return fetcher(req, ...args);
		}

		if (!IS_PRODUCTION) {
			return new Response("Not Found", { status: 404 });
		}

		if (req.method !== "GET" && req.method !== "HEAD") {
			return fetcher(req, ...args);
		}

		// Convention: /<tool_name> serves dist/client/<tool_name>.html
		const toolName = url.pathname.slice(1) || "hello";
		if (toolName && /^[a-z0-9_-]+$/.test(toolName)) {
			const html = await serveFile(DIST_CLIENT_DIR, `${toolName}.html`, {
				"cache-control": "no-cache",
			});
			if (html) return html;
		}

		const asset = await serveFile(DIST_CLIENT_DIR, url.pathname.slice(1), {
			"cache-control": "public, max-age=31536000, immutable",
		});
		if (asset) return asset;

		return fetcher(req, ...args);
	};
}

Bun.serve({
	idleTimeout: 0,
	hostname: "0.0.0.0",
	port: PORT,
	fetch: withLogging(withFrontend(withMcpApiRoute(runtime.fetch))),
});

console.log(`MCP App server started on http://localhost:${PORT}`);
console.log(`- MCP endpoint: http://localhost:${PORT}/api/mcp`);
