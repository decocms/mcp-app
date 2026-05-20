export interface FormatRequest {
	name: string;
	width: number;
	height: number;
	promptHint: string;
}

interface GenerateBody {
	image: string; // base64 PNG
	formats: FormatRequest[];
}

type SupportedSize = "1024x1024" | "1536x1024" | "1024x1536";

export function mapToAspectRatio(width: number, height: number): SupportedSize {
	const ratio = width / height;
	if (ratio > 1.2) return "1536x1024";
	if (ratio < 0.8) return "1024x1536";
	return "1024x1024";
}

export function buildPrompt(format: FormatRequest): string {
	return `Recompose this creative asset for ${format.name} format (${format.width}×${format.height}px). ${format.promptHint}. Maintain brand colors, typography, and key visual elements. Output must look professional and polished.`;
}

export async function generateFormat(
	imageBase64: string,
	format: FormatRequest,
	apiKey: string,
): Promise<string> {
	const imageBytes = Buffer.from(imageBase64, "base64");
	const blob = new Blob([imageBytes], { type: "image/png" });

	const formData = new FormData();
	formData.append("model", "gpt-image-2-2026-04-21");
	formData.append("image", blob, "image.png");
	formData.append("prompt", buildPrompt(format));
	formData.append("size", mapToAspectRatio(format.width, format.height));
	formData.append("quality", "medium");
	formData.append("n", "1");

	const res = await fetch("https://api.openai.com/v1/images/edits", {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}` },
		body: formData,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OpenAI error ${res.status}: ${text}`);
	}

	const data = (await res.json()) as { data: Array<{ b64_json: string }> };
	return data.data[0].b64_json;
}

// biome-ignore lint/suspicious/noExplicitAny: runtime middleware signature
type Fetcher = (req: Request, ...args: any[]) => Response | Promise<Response>;

export function withCreativeResizeRoute(fetcher: Fetcher): Fetcher {
	return async (req: Request, ...args) => {
		const url = new URL(req.url);

		if (
			req.method === "OPTIONS" &&
			url.pathname === "/api/creative-resize/generate"
		) {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		if (
			req.method !== "POST" ||
			url.pathname !== "/api/creative-resize/generate"
		) {
			return fetcher(req, ...args);
		}

		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			return new Response(
				JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		let body: GenerateBody;
		try {
			body = (await req.json()) as GenerateBody;
		} catch {
			return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { image, formats } = body;

		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				const send = (data: object) => {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
					);
				};

				await Promise.all(
					formats.map(async (format) => {
						try {
							const b64Json = await generateFormat(image, format, apiKey);
							send({ name: format.name, b64Json, status: "done" });
						} catch (e) {
							send({ name: format.name, status: "error", error: String(e) });
						}
					}),
				);

				controller.close();
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
			},
		});
	};
}
