import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PresetFormat } from "./formats.ts";
import { PRESET_FORMATS } from "./formats.ts";

export interface SelectedFormat {
	name: string;
	width: number;
	height: number;
	promptHint: string;
}

interface FormatPickerProps {
	selected: SelectedFormat[];
	onChange: (formats: SelectedFormat[]) => void;
}

const CATEGORIES = Array.from(new Set(PRESET_FORMATS.map((f) => f.category)));

export function FormatPicker({ selected, onChange }: FormatPickerProps) {
	const [open, setOpen] = useState(false);
	const [customWidth, setCustomWidth] = useState("");
	const [customHeight, setCustomHeight] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function onClickOutside(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

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
		if (selected.some((s) => s.name === name)) return;
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

	const remove = useCallback(
		(name: string) => onChange(selected.filter((s) => s.name !== name)),
		[selected, onChange],
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="relative" ref={dropdownRef}>
				<Button
					size="sm"
					variant="outline"
					onClick={() => setOpen((o) => !o)}
					className="gap-1.5"
				>
					<Plus className="w-3.5 h-3.5" />
					Add format
				</Button>

				{open && (
					<div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
						<div className="max-h-80 overflow-y-auto">
							{CATEGORIES.map((category) => (
								<div key={category}>
									<p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
										{category}
									</p>
									{PRESET_FORMATS.filter((f) => f.category === category).map(
										(format) => (
											<button
												key={format.name}
												type="button"
												onClick={() => toggle(format)}
												className={cn(
													"w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
													isSelected(format) && "bg-primary/5 text-primary",
												)}
											>
												<span>{format.name}</span>
												<span className="text-xs text-muted-foreground">
													{format.width}×{format.height}
												</span>
											</button>
										),
									)}
								</div>
							))}
						</div>
						<div className="border-t border-border p-3">
							<p className="text-xs font-medium mb-2">Custom size</p>
							<div className="flex items-center gap-2">
								<input
									type="number"
									placeholder="Width"
									value={customWidth}
									onChange={(e) => setCustomWidth(e.target.value)}
									className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<span className="text-muted-foreground">×</span>
								<input
									type="number"
									placeholder="Height"
									value={customHeight}
									onChange={(e) => setCustomHeight(e.target.value)}
									className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								/>
								<Button
									size="sm"
									onClick={addCustom}
									disabled={!customWidth || !customHeight}
								>
									Add
								</Button>
							</div>
						</div>
					</div>
				)}
			</div>

			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selected.map((format) => (
						<span
							key={format.name}
							className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
						>
							{format.name}
							<button
								type="button"
								onClick={() => remove(format.name)}
								className="hover:text-primary/60 transition-colors"
							>
								<X className="w-3 h-3" />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
