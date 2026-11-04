// Cruza o Gerador com a Wake: o que cada produto vai mandar, o que já está lá
// e em que etapa do deploy cada bloco está.
import { type Config, liberada } from "./config.ts";
import {
	type Bloco,
	composicaoCanonica,
	mesmoTexto,
	montarBlocos,
	normRef,
	plano,
	semAcento,
} from "./contrato.ts";
import { catalogo, type ProdutoGerador } from "./gerador.ts";
import {
	corDa,
	type InformacaoAdmin,
	informacoesAdmin,
	paginaDoSite,
	produtosDa,
	urlDoSite,
	type VarianteWake,
} from "./wake.ts";

export type StatusProduto =
	| "fora_da_wake"
	| "aguardando_estilo"
	| "sem_conteudo"
	| "pronto"
	| "publicado";

export type Etapa = "ok" | "diferente" | "ausente" | "nao_verificado" | "erro";

const infoIndexada = (v: VarianteWake, b: Bloco) =>
	v.informations?.find(
		(i) =>
			semAcento(i.title) === semAcento(b.titulo) ||
			semAcento(i.type).startsWith(semAcento(b.label).slice(0, 6)),
	)?.value;

// Composição real vinda do ERP que diverge da do Gerador: não sobrescreve.
export const conflita = (b: Bloco, atual?: string) =>
	!!b.protegido &&
	!!atual &&
	!!plano(atual) &&
	composicaoCanonica(plano(atual)) !== composicaoCanonica(plano(b.texto));

export function analisar(
	cfg: Config,
	p: ProdutoGerador,
	vs: VarianteWake[] = [],
) {
	const blocos = montarBlocos(p);
	const produtos = produtosDa(vs);
	const prontos = blocos.filter((b) => b.pronto);
	const pendentes = prontos.filter((b) =>
		produtos.some((v) => {
			const atual = infoIndexada(v, b);
			return !conflita(b, atual) && !mesmoTexto(atual, b.texto);
		}),
	);
	const status: StatusProduto = !vs.length
		? "fora_da_wake"
		: !p.estilo.validado
			? "aguardando_estilo"
			: !prontos.length
				? "sem_conteudo"
				: pendentes.length
					? "pronto"
					: "publicado";
	return {
		ref: p.ref,
		nome: p.nome,
		familia: p.familia,
		categoria: p.categoria,
		colecao: p.colecao,
		estilo: p.estilo,
		pendencias: p.pendencias,
		linkGerador: p.linkGerador,
		liberadoParaEnvio: liberada(cfg, p.ref),
		status,
		blocos,
		blocosProntos: prontos.length,
		blocosPendentes: pendentes.length,
		blocosBloqueados: blocos.filter((b) => !b.pronto).length,
		produtosWake: produtos.map((v) => ({
			productId: v.productId,
			sku: v.sku,
			nome: v.productName,
			cor: corDa(v) ?? "",
			url: urlDoSite(cfg, v),
		})),
	};
}

export type Analise = ReturnType<typeof analisar>;

// Deploy de cada bloco em cada produto da Wake: gravado (API Admin) →
// indexado (Storefront, de onde o site lê) → visível na PDP do site.
export async function conferirDeploy(
	cfg: Config,
	p: ProdutoGerador,
	vs: VarianteWake[],
	{ site = true } = {},
) {
	const blocos = montarBlocos(p).filter((b) => b.pronto);
	return Promise.all(
		produtosDa(vs).map(async (v) => {
			let admin: InformacaoAdmin[] | null = null;
			let erroAdmin: string | undefined;
			if (cfg.adminToken) {
				try {
					admin = await informacoesAdmin(cfg, v.sku);
				} catch (err) {
					erroAdmin = (err as Error).message;
				}
			}
			const pagina = site ? await paginaDoSite(cfg, v) : null;
			const textoSite = pagina ? plano(pagina.html) : "";
			const etapa = (atual: string | undefined, b: Bloco): Etapa =>
				atual == null || !plano(atual)
					? "ausente"
					: mesmoTexto(atual, b.texto)
						? "ok"
						: "diferente";
			return {
				productId: v.productId,
				sku: v.sku,
				cor: corDa(v) ?? "",
				url: urlDoSite(cfg, v),
				paginaStatus: pagina?.status ?? null,
				erroAdmin,
				blocos: blocos.map((b) => {
					const gravadoAtual = admin?.find(
						(i) => i.tipoInformacao === b.tipoInformacao,
					)?.texto;
					const indexadoAtual = infoIndexada(v, b);
					return {
						tipoInformacao: b.tipoInformacao,
						label: b.label,
						conflito: conflita(b, gravadoAtual ?? indexadoAtual),
						gravado: (admin
							? etapa(gravadoAtual, b)
							: erroAdmin
								? "erro"
								: "nao_verificado") as Etapa,
						indexado: etapa(indexadoAtual, b),
						noSite: (!pagina
							? "nao_verificado"
							: pagina.status !== 200
								? "erro"
								: textoSite.includes(plano(b.marca).slice(0, 60))
									? "ok"
									: "ausente") as Etapa,
					};
				}),
			};
		}),
	);
}

export type Deploy = Awaited<ReturnType<typeof conferirDeploy>>;

export const INDEXAR =
	"Para o site mostrar, indexe no painel da Wake: Storefront › Configurações › Indexar Agora, e limpe o cache da branch.";

export async function produtoDoGerador(cfg: Config, referencia: string) {
	const ref = normRef(referencia);
	if (!ref) throw new Error(`Referência inválida: "${referencia}"`);
	const p = (await catalogo(cfg)).find((x) => x.ref === ref);
	if (!p) throw new Error(`A referência ${ref} não está no Gerador.`);
	return p;
}
