import type { App } from "@modelcontextprotocol/ext-apps/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	LeanCanvasInput,
	LeanCanvasOutput,
} from "../../../api/tools/lean-canvas.ts";

type McpApp = App | null;

interface McpState {
	status: string;
	toolInput?: LeanCanvasInput | null;
	toolResult?: LeanCanvasOutput | null;
}

interface EditingCell {
	sectionKey: string;
	itemIndex: number;
}

const RECOMMENDED_ORDER = [
	"problem",
	"customerSegments",
	"uniqueValueProposition",
	"solution",
	"channels",
	"revenueStreams",
	"costStructure",
	"keyMetrics",
	"unfairAdvantage",
] as const;

const SECTION_LABELS: Record<string, string> = {
	problem: "Problema",
	customerSegments: "Segmentos de Clientes",
	uniqueValueProposition: "Proposta de Valor Única",
	solution: "Solução",
	channels: "Canais",
	revenueStreams: "Fontes de Receita",
	costStructure: "Estrutura de Custos",
	keyMetrics: "Métricas-Chave",
	unfairAdvantage: "Vantagem Competitiva",
};

function getSectionItems(
	canvas: LeanCanvasOutput | null,
	key: string,
): string[] {
	if (!canvas) return [];
	const section = canvas[key as keyof LeanCanvasOutput];
	if (section && typeof section === "object" && "items" in section) {
		return section.items;
	}
	return [];
}

function cloneCanvas(canvas: LeanCanvasOutput): LeanCanvasOutput {
	return JSON.parse(JSON.stringify(canvas));
}

/** Persist canvas state to the server store and update model context */
function persistCanvas(app: McpApp, canvas: LeanCanvasOutput) {
	if (!app) return;
	// Save to store
	try {
		const encoded = encodeURIComponent(JSON.stringify(canvas));
		app.readServerResource({ uri: `data://mcp-app/save-canvas/${encoded}` });
	} catch {
		console.log("[Canvas] Failed to persist canvas to store");
	}
	// Update model context so the AI always sees the latest canvas state
	try {
		app.updateModelContext({
			content: [
				{
					type: "text",
					text: `[Estado atual do Lean Canvas — atualizado pelo usuário via UI]\n${JSON.stringify(canvas, null, 2)}`,
				},
			],
		});
	} catch {
		console.log("[Canvas] Failed to update model context");
	}
}

export function useCanvasState(state: McpState, app: McpApp) {
	const [canvas, setCanvas] = useState<LeanCanvasOutput | null>(null);
	const previousCanvasRef = useRef<LeanCanvasOutput | null>(null);
	const [newItemsBySection, setNewItemsBySection] = useState<
		Map<string, Set<number>>
	>(new Map());
	const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
	const lastToolResultIdRef = useRef<string | null>(null);
	const manualFillSectionRef = useRef<string | null>(null);

	// Update canvas from MCP state
	useEffect(() => {
		let incoming: LeanCanvasOutput | null = null;

		if (state.status === "tool-result" && state.toolResult) {
			incoming = state.toolResult;
		} else if (state.status === "tool-input" && state.toolInput) {
			incoming = state.toolInput as LeanCanvasOutput;
		}

		if (!incoming) return;

		const incomingId = JSON.stringify(incoming);
		if (incomingId === lastToolResultIdRef.current) return;
		lastToolResultIdRef.current = incomingId;

		// Compute new items by comparing with previous canvas
		const newItems = new Map<string, Set<number>>();
		for (const key of RECOMMENDED_ORDER) {
			const oldItems = getSectionItems(previousCanvasRef.current, key);
			const newSectionItems = getSectionItems(incoming, key);
			const newIndices = new Set<number>();

			for (let i = 0; i < newSectionItems.length; i++) {
				if (i >= oldItems.length || oldItems[i] !== newSectionItems[i]) {
					newIndices.add(i);
				}
			}
			if (newIndices.size > 0) {
				newItems.set(key, newIndices);
			}
		}

		previousCanvasRef.current = canvas ? cloneCanvas(canvas) : null;
		setNewItemsBySection(newItems);
		setCanvas(incoming);
	}, [state.status, state.toolResult, state.toolInput, canvas]);

	// Derived state
	const filledCount = useMemo(() => {
		if (!canvas) return 0;
		return RECOMMENDED_ORDER.filter(
			(key) => getSectionItems(canvas, key).length > 0,
		).length;
	}, [canvas]);

	const nextSection = useMemo(() => {
		if (!canvas) return RECOMMENDED_ORDER[0];
		for (const key of RECOMMENDED_ORDER) {
			if (getSectionItems(canvas, key).length === 0) {
				return key;
			}
		}
		return null;
	}, [canvas]);

	const nextSectionLabel = nextSection
		? (SECTION_LABELS[nextSection] ?? null)
		: null;

	// Editing actions
	const startEditing = useCallback((sectionKey: string, itemIndex: number) => {
		setEditingCell({ sectionKey, itemIndex });
		// Clear animation for this section when editing
		setNewItemsBySection((prev) => {
			const next = new Map(prev);
			next.delete(sectionKey);
			return next;
		});
	}, []);

	const cancelEdit = useCallback(() => {
		setEditingCell(null);
	}, []);

	const saveEdit = useCallback(
		(sectionKey: string, itemIndex: number, newValue: string) => {
			if (!canvas) return;

			const updated = cloneCanvas(canvas);
			const section = updated[sectionKey as keyof LeanCanvasOutput];
			if (section && typeof section === "object" && "items" in section) {
				if (newValue.trim() === "") {
					section.items.splice(itemIndex, 1);
				} else {
					section.items[itemIndex] = newValue.trim();
				}
			}

			setCanvas(updated);
			setEditingCell(null);
			persistCanvas(app, updated);

			// Only notify the AI for manual fills (new sections), not edits to existing content
			if (manualFillSectionRef.current === sectionKey) {
				manualFillSectionRef.current = null;
				const sectionLabel = SECTION_LABELS[sectionKey] ?? sectionKey;
				try {
					app?.sendMessage({
						role: "user" as const,
						content: [
							{
								type: "text" as const,
								text: `Eu preenchi a seção "${sectionLabel}" do canvas. Aqui está o estado atual completo:\n\n${JSON.stringify(updated, null, 2)}\n\nContinue me ajudando com as próximas seções.`,
							},
						],
					});
				} catch {
					// sendMessage may not be available in side panel context
					console.log("[Canvas] sendMessage not available in this context");
				}
			}
		},
		[canvas, app],
	);

	const addItem = useCallback(
		(sectionKey: string) => {
			if (!canvas) return;

			const updated = cloneCanvas(canvas);
			const section = updated[sectionKey as keyof LeanCanvasOutput];
			if (section && typeof section === "object" && "items" in section) {
				section.items.push("");
				setCanvas(updated);
				setEditingCell({
					sectionKey,
					itemIndex: section.items.length - 1,
				});
			}
		},
		[canvas],
	);

	const deleteItem = useCallback(
		(sectionKey: string, itemIndex: number) => {
			if (!canvas) return;

			const updated = cloneCanvas(canvas);
			const section = updated[sectionKey as keyof LeanCanvasOutput];
			if (section && typeof section === "object" && "items" in section) {
				section.items.splice(itemIndex, 1);
				setCanvas(updated);
				setEditingCell(null);
				persistCanvas(app, updated);
			}
		},
		[canvas, app],
	);

	const startManualFill = useCallback(
		(sectionKey: string) => {
			manualFillSectionRef.current = sectionKey;
			const updated = canvas
				? cloneCanvas(canvas)
				: ({ projectName: "Projeto sem título" } as LeanCanvasOutput);

			const section = updated[sectionKey as keyof LeanCanvasOutput];
			if (section && typeof section === "object" && "items" in section) {
				section.items.push("");
			} else {
				(updated as Record<string, unknown>)[sectionKey] = {
					items: [""],
				};
			}

			setCanvas(updated);
			setEditingCell({ sectionKey, itemIndex: 0 });
		},
		[canvas],
	);

	return {
		canvas,
		newItemsBySection,
		filledCount,
		nextSection,
		nextSectionLabel,
		isLoading: state.status === "tool-input",

		editingCell,
		startEditing,
		saveEdit,
		cancelEdit,
		addItem,
		deleteItem,
		startManualFill,
	};
}
