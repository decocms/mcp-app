import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { config } from "../lib/config.ts";
import { catalogo } from "../lib/gerador.ts";
import { analisar } from "../lib/pdp.ts";
import { variantesPorRef } from "../lib/wake.ts";
import type { Env } from "../types/env.ts";

export const PDP_PAINEL_RESOURCE_URI = "ui://mcp-app/pdp-painel";

export const pdpPainelInputSchema = z.object({
	filtro: z
		.enum(["todos", "na_wake", "validados", "prontos"])
		.optional()
		.describe("Recorte da lista. Padrão: todos."),
	busca: z
		.string()
		.optional()
		.describe("Filtra por nome, família ou referência."),
});
export type PdpPainelInput = z.infer<typeof pdpPainelInputSchema>;

export async function montarPainel(
	cfg: ReturnType<typeof config>,
	{ filtro = "todos", busca }: PdpPainelInput = {},
) {
	const [cat, wake] = await Promise.all([catalogo(cfg), variantesPorRef(cfg)]);
	const todos = cat.map((p) => analisar(cfg, p, wake.get(p.ref)));
	const termo = busca?.toLowerCase().trim();
	return {
		resumo: {
			total: todos.length,
			naWake: todos.filter((a) => a.status !== "fora_da_wake").length,
			validados: todos.filter((a) => a.estilo.validado).length,
			prontos: todos.filter((a) => a.status === "pronto").length,
			publicados: todos.filter((a) => a.status === "publicado").length,
			validadosNaWake: todos.filter(
				(a) => a.estilo.validado && a.status !== "fora_da_wake",
			).length,
		},
		produtos: todos
			.filter(
				(a) =>
					filtro === "todos" ||
					(filtro === "na_wake" && a.status !== "fora_da_wake") ||
					(filtro === "validados" && a.estilo.validado) ||
					(filtro === "prontos" && a.status === "pronto"),
			)
			.filter(
				(a) =>
					!termo ||
					`${a.ref} ${a.nome} ${a.familia}`.toLowerCase().includes(termo),
			)
			.map(({ blocos, ...a }) => ({
				...a,
				bloqueios: blocos.flatMap((b) => b.motivos),
			})),
		catalogoUrl: cfg.catalogoUrl,
		siteUrl: cfg.siteUrl,
		envioConfigurado: !!cfg.adminToken,
	};
}
export type PdpPainelOutput = Awaited<ReturnType<typeof montarPainel>>;

export const pdpPainelTool = (_env: Env) =>
	createTool({
		id: "pdp_painel",
		description:
			"Painel do deploy de PDPs da Sprint: cruza o Gerador de PDP (copy validada pelo Estilo) com a Wake e mostra, por Referência, o status (fora da Wake, aguardando Estilo, pronto para enviar, publicado). Use para ver o que pode subir para a Wake.",
		inputSchema: pdpPainelInputSchema,
		_meta: { ui: { resourceUri: PDP_PAINEL_RESOURCE_URI } },
		annotations: {
			title: "Deploy de PDP",
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		execute: ({ context, runtimeContext }) =>
			montarPainel(config(runtimeContext), context),
	});
