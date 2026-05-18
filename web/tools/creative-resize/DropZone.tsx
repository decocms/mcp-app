import { cn } from "@/lib/utils.ts";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useRef, useState } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface DropZoneProps {
	onFile: (base64: string, fileName: string) => void;
}

async function fileToBase64(file: File): Promise<string> {
	if (file.type === "application/pdf") {
		return pdfToBase64(file);
	}
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(",")[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

async function pdfToBase64(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const page = await pdf.getPage(1);
	const viewport = page.getViewport({ scale: 2 });
	const canvas = document.createElement("canvas");
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get canvas context");
	await page.render({ canvasContext: ctx, viewport, canvas }).promise;
	return canvas.toDataURL("image/png").split(",")[1];
}

export function DropZone({ onFile }: DropZoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleFile = useCallback(
		async (file: File) => {
			const valid =
				file.type.startsWith("image/") || file.type === "application/pdf";
			if (!valid) {
				setError("Only images and PDFs are supported.");
				return;
			}
			if (file.size > 20 * 1024 * 1024) {
				setError("File must be under 20MB.");
				return;
			}
			setError(null);
			setLoading(true);
			try {
				const base64 = await fileToBase64(file);
				onFile(base64, file.name);
			} catch {
				setError("Failed to read file. Please try again.");
			} finally {
				setLoading(false);
			}
		},
		[onFile],
	);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	const onInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) handleFile(file);
		},
		[handleFile],
	);

	return (
		<div
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault();
				setIsDragging(true);
			}}
			onDragLeave={() => setIsDragging(false)}
			onDrop={onDrop}
			className={cn(
				"w-64 h-64 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer select-none transition-colors",
				isDragging
					? "border-primary bg-primary/5"
					: "border-border hover:border-primary/50 hover:bg-muted/30",
			)}
		>
			<input
				ref={inputRef}
				type="file"
				accept="image/*,application/pdf"
				className="hidden"
				onChange={onInputChange}
			/>
			{loading ? (
				<span className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
			) : (
				<>
					<svg
						className="w-10 h-10 text-muted-foreground"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<div className="text-center">
						<p className="text-sm font-medium">Drop file here</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Image or PDF · up to 20MB
						</p>
					</div>
				</>
			)}
			{error ? (
				<p className="text-xs text-destructive text-center px-4">{error}</p>
			) : null}
		</div>
	);
}
