import { Progress } from "@/components/ui/progress.tsx";

interface CanvasProgressProps {
	filledCount: number;
	nextSectionLabel: string | null;
}

export function CanvasProgress({
	filledCount,
	nextSectionLabel,
}: CanvasProgressProps) {
	const percentage = (filledCount / 9) * 100;

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<span>{filledCount} de 9 seções preenchidas</span>
				{nextSectionLabel && filledCount < 9 ? (
					<span>
						Próxima: <strong>{nextSectionLabel}</strong>
					</span>
				) : null}
				{filledCount === 9 ? (
					<span className="text-primary font-medium">Canvas completo!</span>
				) : null}
			</div>
			<Progress value={percentage} className="h-1.5" />
		</div>
	);
}
