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

export function mapToAspectRatio(width: number, height: number): string {
	const ratio = width / height;
	if (ratio > 1.2) return "3:2";
	if (ratio < 0.8) return "2:3";
	return "1:1";
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
			model: "openai/gpt-5.4-image-2",
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
			modalities: ["image"],
			image_config: { aspect_ratio: mapToAspectRatio(format.width, format.height) },
		}),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`OpenRouter error ${res.status}: ${text}`);
	}

	const data = (await res.json()) as {
		choices: Array<{
			message: {
				images?: Array<{ image_url: { url: string } }>;
				content?: string | Array<{ type: string; image_url?: { url: string } }>;
			};
		}>;
	};

	const msg = data.choices[0]?.message;

	// Try images array first, then content array, then string content
	const imageUrl =
		msg?.images?.[0]?.image_url?.url ??
		(Array.isArray(msg?.content)
			? msg.content.find((c) => c.type === "image_url")?.image_url?.url
			: msg?.content);

	if (!imageUrl) throw new Error("No image returned from OpenRouter");

	return imageUrl.startsWith("data:") ? imageUrl.split(",")[1] : imageUrl;
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
