import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";
import { useTypewriter } from "./use-typewriter.ts";

interface EditableItemProps {
	value: string;
	isEditing: boolean;
	isNew: boolean;
	onStartEdit: () => void;
	onSave: (newValue: string) => void;
	onCancel: () => void;
}

export function EditableItem({
	value,
	isEditing,
	isNew,
	onStartEdit,
	onSave,
	onCancel,
}: EditableItemProps) {
	const [editValue, setEditValue] = useState(value);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const { displayText, isAnimating } = useTypewriter(value, {
		enabled: isNew,
	});

	useEffect(() => {
		if (isEditing) {
			setEditValue(value);
			// Focus textarea on next tick after render
			requestAnimationFrame(() => {
				textareaRef.current?.focus();
				textareaRef.current?.select();
			});
		}
	}, [isEditing, value]);

	if (isEditing) {
		return (
			<li className="flex gap-1.5">
				<span className="text-muted-foreground mt-1.5 shrink-0 text-xs">•</span>
				<Textarea
					ref={textareaRef}
					value={editValue}
					onChange={(e) => setEditValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							onSave(editValue);
						}
						if (e.key === "Escape") {
							onCancel();
						}
					}}
					onBlur={() => onSave(editValue)}
					className="min-h-0 py-0.5 px-1.5 text-xs leading-relaxed border-primary/30 focus-visible:ring-primary/20 resize-none"
					rows={1}
				/>
			</li>
		);
	}

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard editing handled via parent focus flow
		<li
			className={cn(
				"text-xs leading-relaxed flex gap-1.5 group rounded-sm px-0.5 -mx-0.5 cursor-text",
				"hover:bg-muted/50 transition-colors",
				isNew && "animate-fade-in",
			)}
			onClick={(e) => {
				e.stopPropagation();
				if (!isAnimating) onStartEdit();
			}}
		>
			<span className="text-muted-foreground mt-1 shrink-0">•</span>
			<span>
				{isAnimating ? displayText : value}
				{isAnimating && (
					<span className="inline-block w-px h-3 bg-foreground ml-px animate-pulse" />
				)}
			</span>
		</li>
	);
}
