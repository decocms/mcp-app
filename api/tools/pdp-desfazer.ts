import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { config } from "../lib/config.ts";
import { INDEXAR } from "../lib/pdp.ts";
import { desfazer } from "../lib/wake.ts";
import type { Env } from "../types/env.ts";

const acaoSchema = z.object({
	sku: z.string(),
	productId: z.number(),
	tipoInformacao: z.string(),
	titulo: z.string(),
	acao: z.enum(["criado", "atualizado", "igual"]),
	informacaoId: z.number().optional(),
	anterior: z
		.object({
			tipoInformacao: z.string(),
			titulo: z.string(),
			texto: z.string(),
			exibirSite: z.boolean(),
		})
		.optional(),
});

export const pdpDesfazerInputSchema = z.object({
	acoes: z
		.array(acaoSchema)
		.describe("O campo `acoes` devolvido por pdp_publicar."),
	confirmar: z.literal(true),
});
export type PdpDesfazerInput = z.infer<typeof pdpDesfazerInputSchema>;

export const pdpDesfazerTool = (_env: Env) =>
	createTool({
		id: "pdp_desfazer",
		description:
			"Desfaz um envio feito por pdp_publicar: apaga as Informações criadas e volta as atualizadas ao texto anterior.",
		inputSchema: pdpDesfazerInputSchema,
		annotations: {
			title: "Desfazer envio de PDP",
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
		execute: async ({ context, runtimeContext }) => {
			const cfg = config(runtimeContext);
			const feitas: string[] = [];
			const erros: string[] = [];
			for (const a of context.acoes.toReversed()) {
				if (a.acao === "igual") continue;
				try {
					await desfazer(cfg, a);
					feitas.push(
						`${a.sku} · ${a.titulo}: ${a.acao === "criado" ? "apagado" : "restaurado"}`,
					);
				} catch (err) {
					erros.push(`${a.sku} · ${a.titulo}: ${(err as Error).message}`);
				}
			}
			return { feitas, erros, indexar: INDEXAR };
		},
	});
