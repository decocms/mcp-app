import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { store } from "../storage/index.ts";
import type { Env } from "../types/env.ts";

export const CANVAS_STORE_KEY = "canvas:latest";

export const LEAN_CANVAS_RESOURCE_URI = "ui://mcp-app/lean-canvas";
export const CANVAS_STATE_RESOURCE_URI = "data://mcp-app/canvas-state";

const canvasSectionSchema = z.object({
	items: z
		.array(z.string())
		.default([])
		.describe("Itens (bullet points) desta seção"),
	note: z.string().optional().describe("Nota ou explicação breve opcional"),
});

export const leanCanvasInputSchema = z.object({
	projectName: z
		.string()
		.default("Projeto sem título")
		.describe("Nome da startup ou projeto"),
	problem: canvasSectionSchema
		.optional()
		.describe("Os 1-3 principais problemas que seus clientes enfrentam"),
	customerSegments: canvasSectionSchema
		.optional()
		.describe("Clientes-alvo e early adopters"),
	uniqueValueProposition: canvasSectionSchema
		.optional()
		.describe(
			"Mensagem única e clara que explica por que você é diferente e merece atenção",
		),
	solution: canvasSectionSchema
		.optional()
		.describe("As 1-3 principais funcionalidades que resolvem os problemas"),
	channels: canvasSectionSchema
		.optional()
		.describe("Caminhos para alcançar seus clientes"),
	revenueStreams: canvasSectionSchema
		.optional()
		.describe("Como o negócio gera receita"),
	costStructure: canvasSectionSchema
		.optional()
		.describe(
			"Principais custos: aquisição de clientes, distribuição, hospedagem, pessoas, etc.",
		),
	keyMetrics: canvasSectionSchema
		.optional()
		.describe("Números-chave que indicam como o negócio está performando"),
	unfairAdvantage: canvasSectionSchema
		.optional()
		.describe("Algo que não pode ser facilmente copiado ou comprado"),
});

export type LeanCanvasInput = z.infer<typeof leanCanvasInputSchema>;

export const leanCanvasOutputSchema = z.object({
	message: z.string().describe("Mensagem de confirmação da atualização"),
	filledSections: z.array(z.string()).describe("Seções que foram preenchidas"),
});

export type LeanCanvasOutput = z.infer<typeof leanCanvasInputSchema>;
export type LeanCanvasToolOutput = z.infer<typeof leanCanvasOutputSchema>;

export const leanCanvasTool = (_env: Env) =>
	createTool({
		id: "lean_canvas",
		description:
			"Construa e atualize um modelo de negócios Lean Canvas visualmente. Chame esta ferramenta sempre que tiver novas informações para adicionar ao canvas. Passe o estado COMPLETO do canvas incluindo todas as seções preenchidas anteriormente mais as novas ou atualizadas. A UI renderizará o canvas como um grid interativo.",
		inputSchema: leanCanvasInputSchema,
		outputSchema: leanCanvasOutputSchema,
		_meta: { ui: { resourceUri: LEAN_CANVAS_RESOURCE_URI } },
		annotations: {
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		execute: async ({ context }) => {
			await store.set(CANVAS_STORE_KEY, { ...context });

			const sectionNames: Record<string, string> = {
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

			const filled = Object.entries(sectionNames)
				.filter(([key]) => {
					const section = context[key as keyof typeof context];
					return (
						section &&
						typeof section === "object" &&
						"items" in section &&
						Array.isArray(section.items) &&
						section.items.length > 0
					);
				})
				.map(([, label]) => label);

			return {
				message: `Canvas "${context.projectName ?? "Projeto sem título"}" atualizado com ${filled.length} de 9 seções.`,
				filledSections: filled,
			};
		},
	});
