import { Button } from "@/components/ui/button.tsx";
import { useMcpState } from "@/context.tsx";
import { useState } from "react";
import type { CreativeResizeOutput } from "../../../api/tools/creative-resize.ts";
import { AssetPreview } from "./AssetPreview.tsx";
import { DropZone } from "./DropZone.tsx";
import type { SelectedFormat } from "./FormatPicker.tsx";
import { FormatPicker } from "./FormatPicker.tsx";
import type { FormatResult } from "./ResultGrid.tsx";
import { ResultGrid } from "./ResultGrid.tsx";

export default function CreativeResizePage() {
	const state = useMcpState<Record<string, never>, CreativeResizeOutput>();
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
		if (!imageBase64 || selectedFormats.length === 0) return;
		setGenerating(true);

		const pending: FormatResult[] = selectedFormats.map((f) => ({
			name: f.name,
			width: f.width,
			height: f.height,
			status: "pending",
		}));
		setResults(pending);

		try {
			const response = await fetch("/api/creative-resize/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ image: imageBase64, formats: selectedFormats }),
			});

			if (!response.body) throw new Error("No response body");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					try {
						const event = JSON.parse(line.slice(6)) as {
							name: string;
							status: "done" | "error";
							b64Json?: string;
							error?: string;
						};
						setResults((prev) =>
							prev.map((r) =>
								r.name === event.name
									? {
											...r,
											status: event.status,
											b64Json: event.b64Json,
											error: event.error,
										}
									: r,
							),
						);
					} catch {
						// malformed SSE line, skip
					}
				}
			}
		} catch (e) {
			setResults((prev) =>
				prev.map((r) =>
					r.status === "pending"
						? { ...r, status: "error", error: String(e) }
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
