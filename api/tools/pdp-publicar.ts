import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { config, liberada } from "../lib/config.ts";
import {
	analisar,
	conferirDeploy,
	conflita,
	INDEXAR,
	produtoDoGerador,
} from "../lib/pdp.ts";
import {
	type Acao,
	gravarInformacao,
	informacoesAdmin,
	produtosDa,
	variantesPorRef,
} from "../lib/wake.ts";
import type { Env } from "../types/env.ts";

export const pdpPublicarInputSchema = z.object({
	referencia: z.string().describe("Referência Sprint, ex.: 84.00021"),
	confirmar: z
		.literal(true)
		.describe("Confirmação explícita de que é para gravar na Wake."),
	blocos: z
		.array(z.string())
		.optional()
		.describe(
			"Só estes tipos (ex.: Descricao, Beneficios). Padrão: todos os prontos.",
		),
});
export type PdpPublicarInput = z.infer<typeof pdpPublicarInputSchema>;

// Sem UI própria: o Studio mostraria a tool como app e a abriria sozinho. O
// app chama esta tool pelo botão "Enviar para a Wake" do detalhe.
export const pdpPublicarTool = (_env: Env) =>
	createTool({
		id: "pdp_publicar",
		description:
			"Envia para a Wake os blocos prontos de uma Referência da Sprint (cria ou atualiza as Informações do produto em todas as cores). Só envia o que o Estilo validou e referências liberadas na configuração. Não sobrescreve Composição real divergente. Devolve `acoes`, que pdp_desfazer usa para voltar atrás.",
		inputSchema: pdpPublicarInputSchema,
		annotations: {
			title: "Enviar PDP para a Wake",
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: true,
		},
		execute: async ({ context, runtimeContext }) => {
			const cfg = config(runtimeContext);
			const p = await produtoDoGerador(cfg, context.referencia);
			if (!liberada(cfg, p.ref))
				throw new Error(
					`A referência ${p.ref} não está liberada para envio (Referências liberadas, na configuração da conexão).`,
				);
			if (!p.estilo.validado)
				throw new Error(
					`${p.ref} ainda não foi validada pelo Estilo (${p.estilo.texto}).`,
				);
			const vs =
				(await variantesPorRef(cfg, { fresco: true })).get(p.ref) ?? [];
			if (!vs.length) throw new Error(`${p.ref} não está cadastrada na Wake.`);
			const analise = analisar(cfg, p, vs);
			const alvo = analise.blocos.filter(
				(b) =>
					b.pronto &&
					(!context.blocos?.length ||
						context.blocos.includes(b.tipoInformacao)),
			);
			const acoes: Acao[] = [];
			const ignorados: string[] = [];
			const erros: string[] = [];
			for (const v of produtosDa(vs)) {
				let atuais: Awaited<ReturnType<typeof informacoesAdmin>>;
				try {
					atuais = await informacoesAdmin(cfg, v.sku);
				} catch (err) {
					erros.push(`${v.sku}: ${(err as Error).message}`);
					continue;
				}
				for (const b of alvo) {
					const atual = atuais.find(
						(i) => i.tipoInformacao === b.tipoInformacao,
					);
					if (conflita(b, atual?.texto)) {
						ignorados.push(
							`${v.sku} · ${b.label}: a Wake já tem "${atual?.texto?.replace(/<[^>]+>/g, "")}" (ERP). Não sobrescrito.`,
						);
						continue;
					}
					try {
						acoes.push(await gravarInformacao(cfg, v, atuais, b));
					} catch (err) {
						erros.push(`${v.sku} · ${b.label}: ${(err as Error).message}`);
					}
				}
			}
			return {
				...analise,
				acoes,
				ignorados,
				erros,
				deploy: await conferirDeploy(cfg, p, vs, { site: false }),
				envioConfigurado: true,
				indexar: INDEXAR,
			};
		},
	});
