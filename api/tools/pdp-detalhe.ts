import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { config } from "../lib/config.ts";
import {
	analisar,
	conferirDeploy,
	INDEXAR,
	produtoDoGerador,
} from "../lib/pdp.ts";
import { variantesPorRef } from "../lib/wake.ts";
import type { Env } from "../types/env.ts";

export const PDP_DETALHE_RESOURCE_URI = "ui://mcp-app/pdp-detalhe";

export const pdpDetalheInputSchema = z.object({
	// Opcional: o Studio abre a UI de cada tool como app sem argumentos; sem
	// referência, a UI cai no painel.
	referencia: z
		.string()
		.optional()
		.describe("Referência Sprint, ex.: 84.00021"),
	conferirSite: z
		.boolean()
		.optional()
		.describe("Abre a PDP no site para conferir. Padrão: true."),
});
export type PdpDetalheInput = z.infer<typeof pdpDetalheInputSchema>;

export async function montarDetalhe(
	cfg: ReturnType<typeof config>,
	referencia: string,
	{ site = true } = {},
) {
	const p = await produtoDoGerador(cfg, referencia);
	const vs = (await variantesPorRef(cfg, { fresco: true })).get(p.ref) ?? [];
	return {
		...analisar(cfg, p, vs),
		deploy: await conferirDeploy(cfg, p, vs, { site }),
		envioConfigurado: !!cfg.adminToken,
		indexar: INDEXAR,
	};
}
export type PdpDetalheOutput = Awaited<ReturnType<typeof montarDetalhe>>;

export const pdpDetalheTool = (_env: Env) =>
	createTool({
		id: "pdp_detalhe",
		description:
			"Detalhe de uma Referência da Sprint: os blocos que o Gerador manda para a Wake (Descrição, Composição, Especificações, Benefícios, Dados técnicos), o que falta, e o status do deploy de cada bloco em cada cor (gravado na Wake, indexado, visível no site).",
		inputSchema: pdpDetalheInputSchema,
		_meta: { ui: { resourceUri: PDP_DETALHE_RESOURCE_URI } },
		annotations: {
			title: "Deploy de PDP · produto",
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
		execute: async ({ context, runtimeContext }) => {
			if (!context.referencia)
				throw new Error(
					"Informe a referência (ex.: 84.00021). Use pdp_painel para ver a lista.",
				);
			return montarDetalhe(config(runtimeContext), context.referencia, {
				site: context.conferirSite ?? true,
			});
		},
	});
