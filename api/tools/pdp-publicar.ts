import { createTool } from "@decocms/runtime/tools";
import { z } from "zod";
import { config, liberada } from "../lib/config.ts";
import { mesmoTexto } from "../lib/contrato.ts";
import {
	analisar,
	conferirDeploy,
	conflita,
	INDEXAR,
	infoIndexada,
	produtoDoGerador,
} from "../lib/pdp.ts";
import {
	type Acao,
	corDa,
	gravarInformacao,
	type InformacaoAdmin,
	informacoesAdmin,
	produtosDa,
	variantesPorRef,
} from "../lib/wake.ts";

export const pdpPublicarInputSchema = z.object({
	referencia: z.string().describe("Referência Sprint, ex.: 84.00021"),
	confirmar: z
		.literal(true)
		.describe("Confirmação explícita de que é para gravar na Wake."),
	simular: z
		.boolean()
		.optional()
		.describe(
			"Só mostra o que seria gravado em cada cor, sem gravar. Não exige Estilo validado, referência liberada nem token Admin; o que faltar vem em `avisos`.",
		),
	blocos: z
		.array(z.string())
		.optional()
		.describe(
			"Só estes tipos (ex.: Descricao, Beneficios). Padrão: todos os prontos.",
		),
});
export type PdpPublicarInput = z.infer<typeof pdpPublicarInputSchema>;

export interface PassoPlano {
	sku: string;
	cor?: string;
	bloco: string;
	acao: "criaria" | "atualizaria" | "igual";
	// Sem o token Admin, compara com o que a Storefront já indexou.
	fonte: "admin" | "storefront";
}

// Sem UI própria: o Studio mostraria a tool como app e a abriria sozinho. O
// app chama esta tool pelo botão "Enviar para a Wake" do detalhe.
export const pdpPublicarTool = createTool({
	id: "pdp_publicar",
	description:
		"Envia para a Wake os blocos prontos de uma Referência da Sprint (cria ou atualiza as Informações do produto em todas as cores). Com simular: true, só mostra o que seria gravado. Só envia o que o Estilo validou e referências liberadas na configuração. Não sobrescreve Composição real divergente. Devolve `acoes`, que pdp_desfazer usa para voltar atrás.",
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
		const simular = !!context.simular;
		const p = await produtoDoGerador(cfg, context.referencia);
		if (!simular && !liberada(cfg, p.ref))
			throw new Error(
				`A referência ${p.ref} não está liberada para envio (Referências liberadas, na configuração da conexão).`,
			);
		if (!simular && !p.estilo.validado)
			throw new Error(
				`${p.ref} ainda não foi validada pelo Estilo (${p.estilo.texto}).`,
			);
		const vs = (await variantesPorRef(cfg, { fresco: true })).get(p.ref) ?? [];
		if (!vs.length) throw new Error(`${p.ref} não está cadastrada na Wake.`);
		const analise = analisar(cfg, p, vs);
		const alvo = analise.blocos.filter(
			(b) =>
				b.pronto &&
				(!context.blocos?.length || context.blocos.includes(b.tipoInformacao)),
		);
		const acoes: Acao[] = [];
		const plano: PassoPlano[] = [];
		const ignorados: string[] = [];
		const erros: string[] = [];
		for (const v of produtosDa(vs)) {
			let atuais: InformacaoAdmin[] | null = null;
			if (!simular || cfg.adminToken) {
				try {
					atuais = await informacoesAdmin(cfg, v.sku);
				} catch (err) {
					erros.push(`${v.sku}: ${(err as Error).message}`);
					continue;
				}
			}
			for (const b of alvo) {
				const atual = atuais
					? atuais.find((i) => i.tipoInformacao === b.tipoInformacao)?.texto
					: infoIndexada(v, b);
				if (conflita(b, atual)) {
					ignorados.push(
						`${v.sku} · ${b.label}: a Wake já tem "${atual?.replace(/<[^>]+>/g, "")}" (ERP). Não sobrescrito.`,
					);
					continue;
				}
				if (simular) {
					plano.push({
						sku: v.sku,
						cor: corDa(v),
						bloco: b.label,
						acao: !atual
							? "criaria"
							: mesmoTexto(atual, b.texto)
								? "igual"
								: "atualizaria",
						fonte: atuais ? "admin" : "storefront",
					});
					continue;
				}
				try {
					acoes.push(await gravarInformacao(cfg, v, atuais ?? [], b));
				} catch (err) {
					erros.push(`${v.sku} · ${b.label}: ${(err as Error).message}`);
				}
			}
		}
		return {
			...analise,
			simulacao: simular,
			plano,
			avisos: [
				...(simular && !p.estilo.validado
					? [
							`O Estilo ainda não validou ${p.ref} (${p.estilo.texto}): o envio de verdade seria recusado.`,
						]
					: []),
				...(simular && !liberada(cfg, p.ref)
					? [
							`${p.ref} não está em Referências liberadas: o envio de verdade seria recusado.`,
						]
					: []),
			],
			acoes,
			ignorados,
			erros,
			deploy: await conferirDeploy(cfg, p, vs, { site: false }),
			envioConfigurado: !!cfg.adminToken,
			indexar: INDEXAR,
		};
	},
});
