import { X } from "lucide-react";

interface AssetCardProps {
	base64: string;
	fileName: string;
	onRemove: () => void;
}

export function AssetCard({ base64, fileName, onRemove }: AssetCardProps) {
	return (
		<div className="pointer-events-auto group relative w-80 h-80 rounded-2xl overflow-hidden bg-background border border-border shadow-[0_8px_32px_-12px_rgba(0,0,0,0.18)]">
			<img
				src={`data:image/png;base64,${base64}`}
				alt={fileName}
				className="w-full h-full object-contain bg-[color-mix(in_oklab,var(--color-muted)_50%,transparent)]"
				draggable={false}
			/>
			<button
				type="button"
				onClick={onRemove}
				className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
				aria-label="Remove asset"
			>
				<X className="w-3.5 h-3.5" />
			</button>
			<div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
				<p className="text-xs text-white/90 truncate">{fileName}</p>
			</div>
		</div>
	);
}
