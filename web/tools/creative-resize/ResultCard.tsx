import { cn } from "@/lib/utils.ts";
import { AlertCircle } from "lucide-react";

export type FormatResultStatus = "pending" | "done" | "error";

export interface FormatResult {
	name: string;
	width: number;
	height: number;
	status: FormatResultStatus;
	b64Json?: string;
	error?: string;
}

interface ResultCardProps {
	result: FormatResult;
	onClick: () => void;
}

const MAX_DIM = 320;

function friendlyError(raw: string | undefined): { title: string; hint?: string } {
	if (!raw) return { title: "Failed" };
	if (raw.includes("safety system") || raw.includes("rejected")) {
		return {
			title: "Safety filter",
			hint: "OpenAI blocked this image. Try one with less brand/logo content.",
		};
	}
	if (raw.includes("rate limit") || raw.includes("429")) {
		return { title: "Rate limited", hint: "Wait a few seconds and retry." };
	}
	if (raw.includes("billing") || raw.includes("quota")) {
		return { title: "Billing limit", hint: "Add credits at platform.openai.com." };
	}
	if (raw.includes("timeout") || raw.includes("timed out")) {
		return { title: "Timed out", hint: "The model took too long. Try again." };
	}
	return { title: "Failed", hint: raw.slice(0, 80) };
}

function getCardSize(width: number, height: number) {
	const ratio = width / height;
	if (ratio >= 1) {
		return { width: MAX_DIM, height: Math.round(MAX_DIM / ratio) };
	}
	return { width: Math.round(MAX_DIM * ratio), height: MAX_DIM };
}

export function ResultCard({ result, onClick }: ResultCardProps) {
	const { width, height } = getCardSize(result.width, result.height);

	if (result.status === "pending") {
		return (
			<div
				className="pointer-events-auto rounded-xl border border-border animate-pulse bg-[color-mix(in_oklab,var(--color-foreground)_8%,var(--color-background))]"
				style={{ width, height }}
			/>
		);
	}

	if (result.status === "error") {
		const friendly = friendlyError(result.error);
		return (
			<div
				className="pointer-events-auto group rounded-xl border border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center gap-1.5 px-3 relative"
				style={{ width, height }}
				title={result.error}
			>
				<AlertCircle className="w-5 h-5 text-destructive/70" />
				<p className="text-[11px] text-destructive/90 text-center font-medium">
					{friendly.title}
				</p>
				{friendly.hint && (
					<p className="text-[10px] text-destructive/70 text-center px-2 leading-snug">
						{friendly.hint}
					</p>
				)}
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"pointer-events-auto rounded-xl overflow-hidden bg-background border border-border",
				"shadow-[0_4px_16px_-8px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_28px_-10px_rgba(0,0,0,0.25)]",
				"transition-all hover:-translate-y-0.5",
			)}
			style={{ width, height }}
			aria-label={`Open ${result.name}`}
		>
			<img
				src={`data:image/png;base64,${result.b64Json}`}
				alt={result.name}
				className="w-full h-full object-cover"
				draggable={false}
			/>
		</button>
	);
}
