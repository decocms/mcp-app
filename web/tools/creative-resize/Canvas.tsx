import {
	forwardRef,
	type ReactNode,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

export interface CanvasHandle {
	panBy: (delta: { x: number; y: number }) => void;
	reset: () => void;
}

interface CanvasProps {
	children: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const AUTO_PAN_DURATION = 700;

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
	{ children },
	ref,
) {
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [autoPanning, setAutoPanning] = useState(false);
	const panStart = useRef({ x: 0, y: 0 });
	const autoPanTimeoutRef = useRef<number | null>(null);

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

	useImperativeHandle(
		ref,
		() => ({
			panBy(delta) {
				if (autoPanTimeoutRef.current) window.clearTimeout(autoPanTimeoutRef.current);
				setAutoPanning(true);
				setPan((p) => ({ x: p.x + delta.x, y: p.y + delta.y }));
				autoPanTimeoutRef.current = window.setTimeout(
					() => setAutoPanning(false),
					AUTO_PAN_DURATION,
				);
			},
			reset() {
				if (autoPanTimeoutRef.current) window.clearTimeout(autoPanTimeoutRef.current);
				setAutoPanning(true);
				setPan({ x: 0, y: 0 });
				autoPanTimeoutRef.current = window.setTimeout(
					() => setAutoPanning(false),
					AUTO_PAN_DURATION,
				);
			},
		}),
		[],
	);

	const transition = autoPanning
		? `transform ${AUTO_PAN_DURATION}ms ${EASE}, background-position ${AUTO_PAN_DURATION}ms ${EASE}`
		: "none";

	return (
		<div className="fixed inset-0 overflow-hidden select-none bg-[color-mix(in_oklab,var(--color-foreground)_3%,var(--color-background))]">
			<div
				onMouseDown={onMouseDown}
				className={
					isPanning ? "absolute inset-0 cursor-grabbing" : "absolute inset-0 cursor-grab"
				}
				style={{
					backgroundImage:
						"radial-gradient(circle, color-mix(in oklab, var(--color-border) 80%, transparent) 1.2px, transparent 1.2px)",
					backgroundSize: "28px 28px",
					backgroundPosition: `${pan.x}px ${pan.y}px`,
					transition,
				}}
			/>
			<div
				className="absolute top-1/2 left-1/2 pointer-events-none"
				style={{
					transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
					transition,
				}}
			>
				{children}
			</div>
		</div>
	);
});
