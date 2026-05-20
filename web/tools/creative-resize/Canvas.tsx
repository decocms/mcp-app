import { type ReactNode, useEffect, useRef, useState } from "react";

interface CanvasProps {
	children: ReactNode;
}

export function Canvas({ children }: CanvasProps) {
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const panStart = useRef({ x: 0, y: 0 });
	const bgRef = useRef<HTMLDivElement>(null);

	function onMouseDown(e: React.MouseEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		setIsPanning(true);
		panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
	}

	useEffect(() => {
		if (!isPanning) return;
		function onMove(e: MouseEvent) {
			setPan({
				x: e.clientX - panStart.current.x,
				y: e.clientY - panStart.current.y,
			});
		}
		function onUp() {
			setIsPanning(false);
		}
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		return () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
	}, [isPanning]);

	return (
		<div className="fixed inset-0 overflow-hidden select-none bg-[color-mix(in_oklab,var(--color-foreground)_3%,var(--color-background))]">
			<div
				ref={bgRef}
				onMouseDown={onMouseDown}
				className={
					isPanning ? "absolute inset-0 cursor-grabbing" : "absolute inset-0 cursor-grab"
				}
				style={{
					backgroundImage:
						"radial-gradient(circle, color-mix(in oklab, var(--color-border) 80%, transparent) 1.2px, transparent 1.2px)",
					backgroundSize: "28px 28px",
					backgroundPosition: `${pan.x}px ${pan.y}px`,
				}}
			/>
			<div
				className="absolute top-1/2 left-1/2 pointer-events-none"
				style={{
					transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
				}}
			>
				{children}
			</div>
		</div>
	);
}
