import { cn } from "@/lib/utils.ts";
import { Check, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PresetFormat } from "./formats.ts";
import { PRESET_FORMATS } from "./formats.ts";

export interface SelectedFormat {
	name: string;
	width: number;
	height: number;
	promptHint: string;
}

interface FormatDropdownProps {
	selected: SelectedFormat[];
	onChange: (formats: SelectedFormat[]) => void;
	onGenerate: () => void;
	generating: boolean;
}

const CATEGORIES = Array.from(new Set(PRESET_FORMATS.map((f) => f.category)));

export function FormatDropdown({
	selected,
	onChange,
	onGenerate,
	generating,
}: FormatDropdownProps) {
	const [open, setOpen] = useState(false);
	const [customWidth, setCustomWidth] = useState("");
	const [customHeight, setCustomHeight] = useState("");
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function onClickOutside(e: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [open]);

	const isSelected = useCallback(
		(format: PresetFormat) => selected.some((s) => s.name === format.name),
		[selected],
	);

	const toggle = useCallback(
		(format: PresetFormat) => {
			if (isSelected(format)) {
				onChange(selected.filter((s) => s.name !== format.name));
			} else {
				onChange([...selected, format]);
			}
		},
		[selected, onChange, isSelected],
	);

	const addCustom = useCallback(() => {
		const w = Number.parseInt(customWidth, 10);
		const h = Number.parseInt(customHeight, 10);
		if (!w || !h || w <= 0 || h <= 0) return;
		const name = `Custom ${w}×${h}`;
		if (selected.some((s) => s.name === name)) {
			setCustomWidth("");
			setCustomHeight("");
			return;
		}
		onChange([
			...selected,
			{
				name,
				width: w,
				height: h,
				promptHint: `custom ${w}×${h}px format, balanced composition`,
			},
		]);
		setCustomWidth("");
		setCustomHeight("");
	}, [customWidth, customHeight, selected, onChange]);

	const canGenerate = selected.length > 0 && !generating;

	return (
		<div ref={wrapperRef} className="pointer-events-auto relative">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className={cn(
					"h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]",
					open
						? "bg-primary text-primary-foreground rotate-45"
						: "bg-background border border-border text-foreground hover:bg-muted",
				)}
				aria-label="Add formats"
			>
				<Plus className="w-5 h-5" strokeWidth={2.25} />
			</button>

			{open && (
				<div className="absolute left-0 top-full mt-3 w-72 rounded-2xl bg-background border border-border shadow-[0_16px_48px_-16px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col z-50">
					<div className="overflow-y-auto max-h-80">
						{CATEGORIES.map((category) => (
							<div key={category}>
								<p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
									{category}
								</p>
								{PRESET_FORMATS.filter((f) => f.category === category).map(
									(format) => {
										const checked = isSelected(format);
										return (
											<button
												key={format.name}
												type="button"
												onClick={() => toggle(format)}
												className={cn(
													"w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/60 transition-colors",
													checked && "text-foreground",
												)}
											>
												<div className="flex flex-col items-start">
													<span className="font-medium">{format.name}</span>
													<span className="text-[11px] text-muted-foreground">
														{format.width}×{format.height}
													</span>
												</div>
												<div
													className={cn(
														"h-5 w-5 rounded-full flex items-center justify-center transition-colors",
														checked
															? "bg-primary text-primary-foreground"
															: "border border-border",
													)}
												>
													{checked && <Check className="w-3 h-3" strokeWidth={3} />}
												</div>
											</button>
										);
									},
								)}
							</div>
						))}

						<div className="px-3 pt-3 pb-3 border-t border-border mt-1">
							<p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
								Custom
							</p>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="W"
									value={customWidth}
									onChange={(e) => setCustomWidth(e.target.value)}
									className="w-16 h-8 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
								/>
								<span className="text-muted-foreground text-xs">×</span>
								<input
									type="number"
									placeholder="H"
									value={customHeight}
									onChange={(e) => setCustomHeight(e.target.value)}
									className="w-16 h-8 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
								/>
								<button
									type="button"
									onClick={addCustom}
									disabled={!customWidth || !customHeight}
									className="h-8 px-3 rounded-lg bg-muted hover:bg-muted/70 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
								>
									Add
								</button>
							</div>
						</div>
					</div>

					{selected.length > 0 && (
						<div className="border-t border-border p-2.5 bg-background">
							<button
								type="button"
								onClick={() => {
									onGenerate();
									setOpen(false);
								}}
								disabled={!canGenerate}
								className={cn(
									"w-full h-10 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2",
									canGenerate
										? "bg-primary text-primary-foreground hover:opacity-90"
										: "bg-muted text-muted-foreground cursor-not-allowed",
								)}
							>
								{generating ? (
									<>
										<span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
										Generating
									</>
								) : (
									<>
										Generate {selected.length} format
										{selected.length === 1 ? "" : "s"}
									</>
								)}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
