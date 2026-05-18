import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { generateFormat } from "../routes/creative-resize.ts";
import type { Env } from "../types/env.ts";

const formatSchema = z.object({
	name: z.string(),
	width: z.number(),
	height: z.number(),
	promptHint: z.string(),
});

const resultSchema = z.object({
	name: z.string(),
	status: z.enum(["done", "error"]),
	b64Json: z.string().optional(),
	error: z.string().optional(),
});

export const creativeResizeGenerateTool = (_env: Env) =>
	createTool({
		id: "creative_resize_generate",
		description: "Generate resized versions of a brand asset for multiple platform formats using AI.",
		inputSchema: z.object({
			image: z.string().describe("Base64-encoded PNG of the source asset"),
			formats: z.array(formatSchema).describe("Target formats to generate"),
		}),
		outputSchema: z.object({
			results: z.array(resultSchema),
		}),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context }) => {
			const { image, formats } = context;
			const apiKey = process.env.OPENROUTER_API_KEY;
			if (!apiKey) {
				throw new Error("OPENROUTER_API_KEY is not configured");
			}

			const results = await Promise.all(
				formats.map(async (format) => {
					try {
						const b64Json = await generateFormat(image, format, apiKey);
						return { name: format.name, status: "done" as const, b64Json };
					} catch (e) {
						return {
							name: format.name,
							status: "error" as const,
							error: String(e),
						};
					}
				}),
			);

			return { results };
		},
	});
