import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { ItemList } from "./item-list.tsx";

interface CanvasSectionData {
	items: string[];
	note?: string;
}

interface CanvasSectionProps {
	title: string;
	data?: CanvasSectionData;
	isLoading?: boolean;
	isNextRecommended?: boolean;
	colorClass: string;
	className?: string;
	style?: React.CSSProperties;
	newItemIndices?: Set<number>;
	editingItemIndex: number | null;
	onRequestHelp: () => void;
	onStartEdit: (itemIndex: number) => void;
	onSaveEdit: (itemIndex: number, newValue: string) => void;
	onCancelEdit: () => void;
	onAddItem: () => void;
	onStartManualFill: () => void;
}

export function CanvasSection({
	title,
	data,
	isLoading,
	isNextRecommended,
	colorClass,
	className,
	style,
	newItemIndices,
	editingItemIndex,
	onRequestHelp,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	onAddItem,
	onStartManualFill,
}: CanvasSectionProps) {
	const hasContent = data && data.items.length > 0;

	return (
		<Card
			className={cn(
				"relative flex flex-col overflow-hidden transition-all duration-300 py-2 gap-1 border-[#D9D9D7]",
				!hasContent &&
					!isLoading &&
					"border-dashed cursor-pointer hover:border-solid hover:shadow-sm",
				!hasContent && isNextRecommended && "border-primary/50",
				!hasContent && !isNextRecommended && "opacity-60",
				className,
			)}
			style={style}
			onClick={!hasContent && !isLoading ? onRequestHelp : undefined}
		>
			<CardHeader className="px-3 pt-1 pb-0.5 gap-0">
				<Badge variant="secondary" className={cn("w-fit text-xs", colorClass)}>
					{title}
				</Badge>
			</CardHeader>
			<CardContent className="flex-1 px-3 pb-2 pt-0 overflow-y-auto">
				{isLoading && !hasContent ? (
					<div className="space-y-2">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-3/4" />
					</div>
				) : hasContent ? (
					<div className="space-y-1.5 animate-fade-in">
						<ul className="space-y-1">
							<ItemList
								items={data.items}
								editingItemIndex={editingItemIndex}
								newItemIndices={newItemIndices}
								onStartEdit={onStartEdit}
								onSaveEdit={onSaveEdit}
								onCancelEdit={onCancelEdit}
							/>
						</ul>
						{data.note ? (
							<p className="text-[10px] text-muted-foreground italic mt-2">
								{data.note}
							</p>
						) : null}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onAddItem();
							}}
							className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer"
						>
							+ adicionar item
						</button>
					</div>
				) : (
					<div className="flex flex-1 flex-col items-center justify-center">
						<p className="text-xs text-muted-foreground/50 italic">
							{isNextRecommended ? "Próxima seção recomendada" : "Seção vazia"}
						</p>
					</div>
				)}
			</CardContent>
			{/* Pencil icon — manual fill (empty) or add item (filled) */}
			{!isLoading && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						if (hasContent) {
							onAddItem();
						} else {
							onStartManualFill();
						}
					}}
					className="absolute bottom-2 right-2 p-1 rounded text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-pointer"
					aria-label={hasContent ? "Adicionar item" : "Preencher seção"}
				>
					<svg
						role="img"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
						<path d="m15 5 4 4" />
					</svg>
				</button>
			)}
		</Card>
	);
}
