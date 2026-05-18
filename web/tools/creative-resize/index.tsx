import { Button } from "@/components/ui/button.tsx";
import { useMcpApp, useMcpState } from "@/context.tsx";
import { useState } from "react";
import { AssetPreview } from "./AssetPreview.tsx";
import { DropZone } from "./DropZone.tsx";
import type { SelectedFormat } from "./FormatPicker.tsx";
import { FormatPicker } from "./FormatPicker.tsx";
import type { FormatResult } from "./ResultGrid.tsx";
import { ResultGrid } from "./ResultGrid.tsx";

export default function CreativeResizePage() {
	const state = useMcpState();
	const app = useMcpApp();
	const [imageBase64, setImageBase64] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string>("");
	const [selectedFormats, setSelectedFormats] = useState<SelectedFormat[]>([]);
	const [results, setResults] = useState<FormatResult[]>([]);
	const [generating, setGenerating] = useState(false);

	if (state.status === "initializing") {
		return (
			<div className="flex items-center justify-center min-h-dvh p-6">
				<div className="flex items-center gap-3 text-muted-foreground">
					<span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
					<span className="text-sm">Connecting to host...</span>
				</div>
			</div>
		);
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

		try {
			const result = await app.callServerTool({
				name: "creative_resize_generate",
				arguments: { image: imageBase64, formats: selectedFormats },
			});

			if (result.isError) throw new Error("Generation failed");

			const { results: generatedResults } = result.structuredContent as {
				results: Array<{
					name: string;
					status: "done" | "error";
					b64Json?: string;
					error?: string;
				}>;
			};

			setResults((prev) =>
				prev.map((r) => {
					const found = generatedResults.find((g) => g.name === r.name);
					return found ? { ...r, ...found } : r;
				}),
			);
		} catch (e) {
			setResults((prev) =>
				prev.map((r) =>
					r.status === "pending"
						? { ...r, status: "error" as const, error: String(e) }
						: r,
				),
			);
		} finally {
			setGenerating(false);
		}
	}

	return (
		<div className="min-h-dvh p-8 flex flex-col gap-8">
			<div>
				<h1 className="text-2xl font-semibold">Creative Resize</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Upload a brand asset and generate adapted versions for every platform.
				</p>
			</div>

			<div className="flex items-start gap-6 flex-wrap">
				{imageBase64 ? (
					<AssetPreview
						base64={imageBase64}
						fileName={fileName}
						onRemove={() => {
							setImageBase64(null);
							setFileName("");
							setResults([]);
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

				<div className="flex flex-col gap-4">
					<FormatPicker
						selected={selectedFormats}
						onChange={setSelectedFormats}
					/>
					<Button
						onClick={generate}
						disabled={!imageBase64 || selectedFormats.length === 0 || generating}
						className="self-start"
					>
						{generating ? (
							<>
								<span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
								Generating…
							</>
						) : (
							"Generate"
						)}
					</Button>
				</div>
			</div>

			{results.length > 0 && <ResultGrid results={results} />}
		</div>
	);
}
