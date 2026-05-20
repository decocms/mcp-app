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

type JobStatus = "pending" | "done" | "error";

interface Job {
	status: JobStatus;
	b64Json?: string;
	error?: string;
	startedAt: number;
}

const jobs = new Map<string, Job>();

const TEN_MINUTES = 10 * 60 * 1000;
setInterval(() => {
	const now = Date.now();
	for (const [id, job] of jobs) {
		if (now - job.startedAt > TEN_MINUTES) jobs.delete(id);
	}
}, 60_000);

export const creativeResizeStartTool = (_env: Env) =>
	createTool({
		id: "creative_resize_start",
		description: "Start generating one resized format. Returns a jobId immediately; poll creative_resize_status for the result.",
		inputSchema: z.object({
			image: z.string().describe("Base64-encoded PNG of the source asset"),
			format: formatSchema,
		}),
		outputSchema: z.object({ jobId: z.string() }),
		annotations: {
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context }) => {
			const apiKey = process.env.OPENAI_API_KEY;
			if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

			const jobId = crypto.randomUUID();
			jobs.set(jobId, { status: "pending", startedAt: Date.now() });

			generateFormat(context.image, context.format, apiKey)
				.then((b64Json) => {
					jobs.set(jobId, { status: "done", b64Json, startedAt: Date.now() });
				})
				.catch((e) => {
					jobs.set(jobId, {
						status: "error",
						error: String(e),
						startedAt: Date.now(),
					});
				});

			return { jobId };
		},
	});

export const creativeResizeStatusTool = (_env: Env) =>
	createTool({
		id: "creative_resize_status",
		description: "Get the current status of a creative_resize_start job.",
		inputSchema: z.object({ jobId: z.string() }),
		outputSchema: z.object({
			status: z.enum(["pending", "done", "error"]),
			b64Json: z.string().optional(),
			error: z.string().optional(),
		}),
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		execute: async ({ context }) => {
			const job = jobs.get(context.jobId);
			if (!job) {
				return { status: "error" as const, error: "Job not found" };
			}
			return {
				status: job.status,
				b64Json: job.b64Json,
				error: job.error,
			};
		},
	});
