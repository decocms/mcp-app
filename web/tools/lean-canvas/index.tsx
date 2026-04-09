import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useMcpApp, useMcpState } from "@/context.tsx";
import type {
	LeanCanvasInput,
	LeanCanvasOutput,
} from "../../../api/tools/lean-canvas.ts";
import { CanvasGrid } from "./canvas-grid.tsx";
import { useCanvasPolling } from "./use-canvas-polling.ts";
import { useCanvasState } from "./use-canvas-state.ts";

const EMPTY_CANVAS: LeanCanvasOutput = {
	projectName: "Lean Canvas",
} as LeanCanvasOutput;

const LEAN_CANVAS_CONTEXT = `Você é um consultor de startups construindo um Lean Canvas. Responda em português brasileiro.

REGRAS CRÍTICAS:
- NUNCA peça permissão, NUNCA apresente planos, NUNCA pergunte "posso começar/seguir?".
- NUNCA faça perguntas sobre o método Lean Canvas ou sobre o processo. O usuário não precisa saber como funciona.
- Suas perguntas devem ser SEMPRE sobre o NEGÓCIO do usuário: dores dos clientes, mercado, concorrência, modelo de receita, etc.
- Ao receber a ideia, NÃO preencha nada ainda. Primeiro faça 2-3 perguntas sobre o NEGÓCIO para entender o contexto (ex: "Quem sofre mais com essa dor?", "Como resolvem isso hoje?"). Só preencha depois que o usuário responder.
- NUNCA preencha mais de 1-2 seções por vez. Construa progressivamente.
- NUNCA pergunte sobre o processo ("Vamos começar pelo problema?", "Posso preencher X?"). Apenas faça perguntas sobre o NEGÓCIO e preencha as seções.
- Trabalhe nesta ordem: Problema → Segmentos de Clientes → Proposta de Valor → Solução → Canais → Receita → Custos → Métricas → Vantagem Competitiva.
- Ao chamar lean_canvas, SEMPRE inclua todas as seções já preenchidas.`;

export default function LeanCanvasPage() {
	const state = useMcpState<LeanCanvasInput, LeanCanvasOutput>();
	const app = useMcpApp();
	const [ideaSubmitted, setIdeaSubmitted] = useState(false);
	const [idea, setIdea] = useState("");

	// Poll canvas state from server via MCP protocol
	const polledCanvas = useCanvasPolling(app);

	// Feed polled data into canvas state manager
	const polledState = useMemo(
		() =>
			polledCanvas
				? {
						status: "tool-result" as const,
						toolResult: polledCanvas,
					}
				: { status: state.status as string },
		[polledCanvas, state.status],
	);

	const {
		canvas,
		newItemsBySection,
		filledCount,
		nextSection,
		nextSectionLabel,
		editingCell,
		startEditing,
		saveEdit,
		cancelEdit,
		addItem,
		deleteItem,
		startManualFill,
	} = useCanvasState(polledState, app);

	const handleSubmitIdea = async () => {
		if (!idea.trim()) return;
		setIdeaSubmitted(true);

		const contextText = `${LEAN_CANVAS_CONTEXT}\n\nIdeia do usuário: "${idea.trim()}"`;

		// 1. Inject the idea + instructions into the model context.
		//    This works from the side panel (goes via MCP protocol).
		//    The context becomes available on the next user message.
		try {
			await app?.updateModelContext({
				content: [{ type: "text", text: contextText }],
			});
			console.log("[LeanCanvas] Model context updated with idea");
		} catch (err) {
			console.log("[LeanCanvas] updateModelContext failed:", err);
		}

		// 2. Also save idea to store (backup for the prompt)
		try {
			const encoded = encodeURIComponent(idea.trim());
			await app?.readServerResource({
				uri: `data://mcp-app/save-idea/${encoded}`,
			});
		} catch {
			// May fail if resource template not matched
		}

		// 3. Try sendMessage as well (works in inline context, not in side panel)
		try {
			app?.sendMessage({
				role: "user",
				content: [
					{
						type: "text",
						text: `Minha ideia de startup/negócio: ${idea.trim()}

INSTRUÇÕES (não exiba ao usuário):
${LEAN_CANVAS_CONTEXT}

Comece agora: faça 2-3 perguntas estratégicas sobre o NEGÓCIO para entender melhor antes de preencher qualquer seção.`,
					},
				],
			});
		} catch {
			// Expected to fail in side panel
		}
	};

	const handleRequestHelp = (sectionTitle: string) => {
		try {
			app?.sendMessage({
				role: "user",
				content: [
					{
						type: "text",
						text: `Me ajude a preencher a seção "${sectionTitle}" do meu Lean Canvas.`,
					},
				],
			});
		} catch {
			// sendMessage not available in side panel
		}
	};

	const handleSaveEdit = (
		sectionKey: string,
		itemIndex: number,
		newValue: string,
	) => {
		if (newValue.trim() === "") {
			deleteItem(sectionKey, itemIndex);
		} else {
			saveEdit(sectionKey, itemIndex, newValue);
		}
	};

	if (state.status === "initializing") {
		return (
			<div className="flex items-center justify-center min-h-dvh p-6">
				<div className="flex items-center gap-3 text-muted-foreground">
					<span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
					<span className="text-sm">Conectando ao host...</span>
				</div>
			</div>
		);
	}

	// Welcome screen: user types their idea
	if (!ideaSubmitted && !canvas) {
		return (
			<div
				className="flex items-center justify-center min-h-dvh p-6 bg-cover bg-center bg-no-repeat"
				style={{
					backgroundImage:
						"url('https://assets.decocache.com/decocms/5ff225c1-6f6b-4655-9310-9bff60a0ba7b/bg-lean.png')",
				}}
			>
				<Card className="w-full max-w-lg backdrop-blur-sm bg-background/90">
					<CardHeader className="text-center">
						<CardTitle>Lean Canvas Builder</CardTitle>
						<p className="text-muted-foreground text-sm mt-1">
							Conte sobre sua ideia de negócio e eu vou te ajudar a estruturá-la
							em um Lean Canvas.
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						<Textarea
							placeholder="Ex: Quero criar uma plataforma que conecta freelancers de design a pequenas empresas que precisam de identidade visual acessível..."
							value={idea}
							onChange={(e) => setIdea(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSubmitIdea();
								}
							}}
							className="min-h-28 text-sm"
						/>
						<Button
							className="w-full"
							disabled={!idea.trim()}
							onClick={handleSubmitIdea}
						>
							Começar
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// After submitting: show canvas + instruction
	const displayCanvas = canvas ?? EMPTY_CANVAS;

	return (
		<div className="min-h-dvh p-4">
			<CanvasGrid
				data={displayCanvas}
				isLoading={!canvas}
				filledCount={filledCount}
				nextSection={nextSection}
				nextSectionLabel={nextSectionLabel}
				newItemsBySection={newItemsBySection}
				editingCell={editingCell}
				onRequestHelp={handleRequestHelp}
				onStartEdit={startEditing}
				onSaveEdit={handleSaveEdit}
				onCancelEdit={cancelEdit}
				onAddItem={addItem}
				onStartManualFill={startManualFill}
			/>
		</div>
	);
}
