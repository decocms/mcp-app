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
				className="pointer-events-auto rounded-xl bg-muted animate-pulse"
				style={{ width, height }}
			/>
		);
	}

	if (result.status === "error") {
		return (
			<div
				className="pointer-events-auto rounded-xl border border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center gap-1 px-3"
				style={{ width, height }}
				title={result.error}
			>
				<AlertCircle className="w-5 h-5 text-destructive/70" />
				<p className="text-[10px] text-destructive/80 text-center line-clamp-2">
					{result.error ?? "Failed"}
				</p>
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
