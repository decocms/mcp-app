import { Button } from "@/components/ui/button.tsx";
import { X } from "lucide-react";

interface AssetPreviewProps {
	base64: string;
	fileName: string;
	onRemove: () => void;
}

export function AssetPreview({ base64, fileName, onRemove }: AssetPreviewProps) {
	return (
		<div className="relative w-64 h-64 rounded-xl overflow-hidden border border-border">
			<img
				src={`data:image/png;base64,${base64}`}
				alt={fileName}
				className="w-full h-full object-contain bg-muted/20"
			/>
			<Button
				size="icon"
				variant="secondary"
				onClick={onRemove}
				className="absolute top-2 right-2 h-7 w-7 rounded-full shadow"
			>
				<X className="w-3.5 h-3.5" />
			</Button>
			<div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-3 py-1.5">
				<p className="text-xs text-muted-foreground truncate">{fileName}</p>
			</div>
		</div>
	);
}
