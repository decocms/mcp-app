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
	const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "google/gemini-2.0-flash-exp:free",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: buildPrompt(format) },
						{
							type: "image_url",
							image_url: { url: `data:image/png;base64,${imageBase64}` },
						},
					],
				},
			],
			modalities: ["image", "text"],
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OpenRouter error ${res.status}: ${text}`);
	}

	const data = (await res.json()) as {
		choices: Array<{
			message: {
				content: string | Array<{ type: string; image_url?: { url: string } }>;
			};
		}>;
	};

	const content = data.choices[0]?.message?.content;
	const parts = Array.isArray(content) ? content : [];
	const imagePart = parts.find((p) => p.type === "image_url");

	if (!imagePart?.image_url?.url) {
		throw new Error("No image returned from OpenRouter");
	}

	const url = imagePart.image_url.url;
	return url.startsWith("data:") ? url.split(",")[1] : url;
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

		const apiKey = process.env.OPENROUTER_API_KEY;
		if (!apiKey) {
			return new Response(
				JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
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
