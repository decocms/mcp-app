import { useMcpApp, useMcpState } from "@/context.tsx";
import { useRef, useState } from "react";
import { AssetCard } from "./AssetCard.tsx";
import { Canvas, type CanvasHandle } from "./Canvas.tsx";
import { DropZone } from "./DropZone.tsx";
import { FormatDropdown, type SelectedFormat } from "./FormatDropdown.tsx";
import { Lightbox } from "./Lightbox.tsx";
import { type FormatResult, ResultCard } from "./ResultCard.tsx";

export default function CreativeResizePage() {
	const state = useMcpState();
	const app = useMcpApp();
	const [imageBase64, setImageBase64] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string>("");
	const [selectedFormats, setSelectedFormats] = useState<SelectedFormat[]>([]);
	const [results, setResults] = useState<FormatResult[]>([]);
	const [generating, setGenerating] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const canvasRef = useRef<CanvasHandle>(null);
	const resultsRef = useRef<HTMLDivElement>(null);

	if (state.status === "initializing") {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-background">
				<span className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
			</div>
		);
	}

	function centerOnResults() {
		requestAnimationFrame(() => {
			const el = resultsRef.current;
			if (!el || !canvasRef.current) return;
			const rect = el.getBoundingClientRect();
			const targetX = window.innerWidth / 2 - (rect.left + rect.width / 2);
			const targetY = window.innerHeight / 2 - (rect.top + rect.height / 2);
			canvasRef.current.panBy({ x: targetX, y: targetY });
		});
	}

	async function generate() {
		if (!imageBase64 || selectedFormats.length === 0 || !app) return;
		setGenerating(true);

		const pending: FormatResult[] = selectedFormats.map((f) => ({
			name: f.name,
			width: f.width,
			height: f.height,
			status: "pending",
		}));
		setResults(pending);
		centerOnResults();

		await Promise.all(
			selectedFormats.map(async (format) => {
				try {
					const res = await app.callServerTool({
						name: "creative_resize_generate",
						arguments: { image: imageBase64, formats: [format] },
					});
					if (res.isError) throw new Error("Generation failed");
					const { results: gen } = res.structuredContent as {
						results: Array<{
							name: string;
							status: "done" | "error";
							b64Json?: string;
							error?: string;
						}>;
					};
					const r = gen[0];
					setResults((prev) =>
						prev.map((p) => (p.name === format.name ? { ...p, ...r } : p)),
					);
				} catch (e) {
					setResults((prev) =>
						prev.map((p) =>
							p.name === format.name
								? { ...p, status: "error" as const, error: String(e) }
								: p,
						),
					);
				}
			}),
		);

		setGenerating(false);
	}

	const doneResults = results.filter((r) => r.status === "done" && r.b64Json);

	return (
		<>
			<Canvas ref={canvasRef}>
				<div className="flex items-center gap-10">
					<div className="flex items-start gap-4">
						{imageBase64 ? (
							<AssetCard
								base64={imageBase64}
								fileName={fileName}
								onRemove={() => {
									setImageBase64(null);
									setFileName("");
									setResults([]);
									setSelectedFormats([]);
									canvasRef.current?.reset();
								}}
							/>
						) : (
							<DropZone
								onFile={(b64, name) => {
									setImageBase64(b64);
									setFileName(name);
									setResults([]);
								}}
							/>
						)}

						{imageBase64 && (
							<div className="mt-[136px]">
								<FormatDropdown
									selected={selectedFormats}
									onChange={setSelectedFormats}
									onGenerate={generate}
									generating={generating}
								/>
							</div>
						)}
					</div>

					{results.length > 0 && (
						<div ref={resultsRef} className="flex gap-4 items-center">
							{results.map((result) => {
								const doneIndex = doneResults.findIndex(
									(d) => d.name === result.name,
								);
								return (
									<ResultCard
										key={result.name}
										result={result}
										onClick={() => {
											if (doneIndex >= 0) setLightboxIndex(doneIndex);
										}}
									/>
								);
							})}
						</div>
					)}
				</div>
			</Canvas>

			{lightboxIndex !== null && doneResults.length > 0 && (
				<Lightbox
					results={results}
					index={Math.min(lightboxIndex, doneResults.length - 1)}
					onIndexChange={setLightboxIndex}
					onClose={() => setLightboxIndex(null)}
				/>
			)}
		</>
	);
}
