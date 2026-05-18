import { Button } from "@/components/ui/button.tsx";
import { zip } from "fflate";
import { Download } from "lucide-react";
import { useCallback } from "react";

export type FormatResultStatus = "pending" | "done" | "error";

export interface FormatResult {
	name: string;
	width: number;
	height: number;
	status: FormatResultStatus;
	b64Json?: string;
	error?: string;
}

interface ResultGridProps {
	results: FormatResult[];
}

function downloadOne(result: FormatResult) {
	if (!result.b64Json) return;
	const link = document.createElement("a");
	link.href = `data:image/png;base64,${result.b64Json}`;
	link.download = `${result.name.replace(/\s+/g, "_")}.png`;
	link.click();
}

function downloadAll(results: FormatResult[]) {
	const done = results.filter((r) => r.status === "done" && r.b64Json);
	if (done.length === 0) return;

	const files: Record<string, Uint8Array> = {};
	for (const result of done) {
		const binary = atob(result.b64Json!);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		files[`${result.name.replace(/[\s/]+/g, "_")}.png`] = bytes;
	}

	zip(files, (err, data) => {
		if (err) return;
		const blob = new Blob([data], { type: "application/zip" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "creative-formats.zip";
		link.click();
		URL.revokeObjectURL(url);
	});
}

function ResultCard({ result }: { result: FormatResult }) {
	if (result.status === "pending") {
		return (
			<div className="rounded-xl border border-border overflow-hidden">
				<div className="aspect-square bg-muted animate-pulse" />
				<div className="p-2.5 space-y-1.5">
					<div className="h-3 bg-muted animate-pulse rounded w-3/4" />
					<div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
				</div>
			</div>
		);
	}

	if (result.status === "error") {
		return (
			<div className="rounded-xl border border-destructive/50 overflow-hidden">
				<div className="aspect-square bg-destructive/5 flex items-center justify-center">
					<p className="text-xs text-destructive text-center px-3">
						{result.error ?? "Generation failed"}
					</p>
				</div>
				<div className="p-2.5">
					<p className="text-xs font-medium truncate">{result.name}</p>
					<p className="text-xs text-muted-foreground">
						{result.width}×{result.height}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border overflow-hidden group">
			<div className="aspect-square bg-muted/20 relative">
				<img
					src={`data:image/png;base64,${result.b64Json}`}
					alt={result.name}
					className="w-full h-full object-contain"
				/>
				<button
					type="button"
					onClick={() => downloadOne(result)}
					className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
				>
					<Download className="w-5 h-5 text-white" />
				</button>
			</div>
			<div className="p-2.5 flex items-center justify-between">
				<div className="min-w-0">
					<p className="text-xs font-medium truncate">{result.name}</p>
					<p className="text-xs text-muted-foreground">
						{result.width}×{result.height}
					</p>
				</div>
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7 shrink-0"
					onClick={() => downloadOne(result)}
				>
					<Download className="w-3.5 h-3.5" />
				</Button>
			</div>
		</div>
	);
}

export function ResultGrid({ results }: ResultGridProps) {
	const allDone = results.every((r) => r.status !== "pending");
	const hasDone = results.some((r) => r.status === "done");

	const handleDownloadAll = useCallback(() => downloadAll(results), [results]);

	return (
		<div className="flex flex-col gap-4">
			{allDone && hasDone && (
				<div className="flex justify-end">
					<Button onClick={handleDownloadAll} className="gap-2">
						<Download className="w-4 h-4" />
						Download all (.zip)
					</Button>
				</div>
			)}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
				{results.map((result) => (
					<ResultCard key={result.name} result={result} />
				))}
			</div>
		</div>
	);
}
