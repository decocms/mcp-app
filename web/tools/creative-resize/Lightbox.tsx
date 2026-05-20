import { zip } from "fflate";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import type { FormatResult } from "./ResultCard.tsx";

interface LightboxProps {
	results: FormatResult[];
	index: number;
	onIndexChange: (i: number) => void;
	onClose: () => void;
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
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
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

export function Lightbox({ results, index, onIndexChange, onClose }: LightboxProps) {
	const doneResults = results.filter((r) => r.status === "done" && r.b64Json);
	const current = doneResults[index];

	const next = useCallback(() => {
		if (doneResults.length === 0) return;
		onIndexChange((index + 1) % doneResults.length);
	}, [index, doneResults.length, onIndexChange]);

	const prev = useCallback(() => {
		if (doneResults.length === 0) return;
		onIndexChange((index - 1 + doneResults.length) % doneResults.length);
	}, [index, doneResults.length, onIndexChange]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
			else if (e.key === "ArrowRight") next();
			else if (e.key === "ArrowLeft") prev();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, next, prev]);

	if (!current) return null;

	return (
		<div
			className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center"
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
			role="dialog"
		>
			<div className="absolute top-4 right-4 flex items-center gap-2 z-10">
				{doneResults.length > 1 && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							downloadAll(results);
						}}
						className="h-10 px-4 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
					>
						<Download className="w-4 h-4" />
						Download all
					</button>
				)}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onClose();
					}}
					className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
					aria-label="Close"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{doneResults.length > 1 && (
				<>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							prev();
						}}
						className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center z-10"
						aria-label="Previous"
					>
						<ChevronLeft className="w-6 h-6" />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							next();
						}}
						className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center z-10"
						aria-label="Next"
					>
						<ChevronRight className="w-6 h-6" />
					</button>
				</>
			)}

			<div
				className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="presentation"
			>
				<img
					src={`data:image/png;base64,${current.b64Json}`}
					alt={current.name}
					className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
					draggable={false}
				/>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						downloadOne(current);
					}}
					className="absolute bottom-4 right-4 h-10 px-4 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
				>
					<Download className="w-4 h-4" />
					Download
				</button>
				<div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-xs">
					{current.name} · {current.width}×{current.height}
				</div>
			</div>
		</div>
	);
}
