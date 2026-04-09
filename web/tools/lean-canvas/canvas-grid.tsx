import { Button } from "@/components/ui/button.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import type { LeanCanvasOutput } from "../../../api/tools/lean-canvas.ts";
import { CanvasProgress } from "./canvas-progress.tsx";
import { CanvasSection } from "./canvas-section.tsx";
import { downloadMarkdown, downloadPdf } from "./export-canvas.ts";

interface EditingCell {
	sectionKey: string;
	itemIndex: number;
}

interface CanvasGridProps {
	data: LeanCanvasOutput;
	isLoading?: boolean;
	filledCount: number;
	nextSection: string | null;
	nextSectionLabel: string | null;
	newItemsBySection: Map<string, Set<number>>;
	editingCell: EditingCell | null;
	onRequestHelp: (section: string) => void;
	onStartEdit: (sectionKey: string, itemIndex: number) => void;
	onSaveEdit: (sectionKey: string, itemIndex: number, newValue: string) => void;
	onCancelEdit: () => void;
	onAddItem: (sectionKey: string) => void;
	onStartManualFill: (sectionKey: string) => void;
}

const SECTIONS = [
	{
		key: "problem" as const,
		title: "Problema",
		colorClass: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
		gridArea: "problem",
	},
	{
		key: "solution" as const,
		title: "Solução",
		colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
		gridArea: "solution",
	},
	{
		key: "keyMetrics" as const,
		title: "Métricas-Chave",
		colorClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
		gridArea: "metrics",
	},
	{
		key: "uniqueValueProposition" as const,
		title: "Proposta de Valor Única",
		colorClass:
			"bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
		gridArea: "uvp",
	},
	{
		key: "unfairAdvantage" as const,
		title: "Vantagem Competitiva",
		colorClass:
			"bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
		gridArea: "advantage",
	},
	{
		key: "channels" as const,
		title: "Canais",
		colorClass: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
		gridArea: "channels",
	},
	{
		key: "customerSegments" as const,
		title: "Segmentos de Clientes",
		colorClass:
			"bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
		gridArea: "customers",
	},
	{
		key: "costStructure" as const,
		title: "Estrutura de Custos",
		colorClass:
			"bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
		gridArea: "costs",
	},
	{
		key: "revenueStreams" as const,
		title: "Fontes de Receita",
		colorClass:
			"bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
		gridArea: "revenue",
	},
] as const;

export function CanvasGrid({
	data,
	isLoading,
	filledCount,
	nextSection,
	nextSectionLabel,
	newItemsBySection,
	editingCell,
	onRequestHelp,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	onAddItem,
	onStartManualFill,
}: CanvasGridProps) {
	const renderSection = (
		section: (typeof SECTIONS)[number],
		style?: React.CSSProperties,
	) => (
		<CanvasSection
			key={section.key}
			title={section.title}
			data={data[section.key]}
			isLoading={isLoading}
			isNextRecommended={nextSection === section.key}
			colorClass={section.colorClass}
			newItemIndices={newItemsBySection.get(section.key)}
			editingItemIndex={
				editingCell?.sectionKey === section.key ? editingCell.itemIndex : null
			}
			onRequestHelp={() => onRequestHelp(section.title)}
			onStartEdit={(itemIndex) => onStartEdit(section.key, itemIndex)}
			onSaveEdit={(itemIndex, newValue) =>
				onSaveEdit(section.key, itemIndex, newValue)
			}
			onCancelEdit={onCancelEdit}
			onAddItem={() => onAddItem(section.key)}
			onStartManualFill={() => onStartManualFill(section.key)}
			style={style}
		/>
	);

	return (
		<div className="w-full space-y-4">
			<div className="flex items-center justify-between">
				<div className="w-28" />
				<h2 className="text-lg font-semibold text-center">
					{data.projectName}
				</h2>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5 text-xs border-[#D9D9D7] text-[#6E6E6A]"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Exportar</title>
								<path d="M12 17V3" />
								<path d="m6 11 6 6 6-6" />
								<path d="M19 21H5" />
							</svg>
							Exportar
							<svg
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
								<title>Menu</title>
								<path d="m6 9 6 6 6-6" />
							</svg>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="border-[#D9D9D7] text-[#6E6E6A]"
					>
						<DropdownMenuItem onClick={() => downloadPdf(data)}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="mr-2"
							>
								<title>PDF</title>
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
							Exportar PDF
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => downloadMarkdown(data)}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="mr-2"
							>
								<title>Markdown</title>
								<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
								<path d="M14 2v4a2 2 0 0 0 2 2h4" />
								<path d="M10 9H8" />
								<path d="M16 13H8" />
								<path d="M16 17H8" />
							</svg>
							Exportar Markdown
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<CanvasProgress
				filledCount={filledCount}
				nextSectionLabel={nextSectionLabel}
			/>
			{/* Desktop: classic Lean Canvas grid layout */}
			<div
				className="hidden md:grid gap-2"
				style={{
					gridTemplateColumns: "repeat(10, 1fr)",
					gridTemplateRows: "280px 280px 200px",
					gridTemplateAreas: `
						"problem problem solution solution uvp uvp advantage advantage customers customers"
						"problem problem metrics metrics uvp uvp channels channels customers customers"
						"costs costs costs costs costs revenue revenue revenue revenue revenue"
					`,
				}}
			>
				{SECTIONS.map((section) =>
					renderSection(section, {
						gridArea: section.gridArea,
					}),
				)}
			</div>
			{/* Mobile: stacked layout */}
			<div className="md:hidden space-y-2">
				{SECTIONS.map((section) => renderSection(section))}
			</div>
		</div>
	);
}
