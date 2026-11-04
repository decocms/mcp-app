// Gerador de PDP da Sprint (sprint-pdp.vercel.app): o catalogo.json é a fonte
// da copy. A chave é a Referência ("84.00021"); `revisao` preenchida = o
// Estilo validou. O pacote exportado (zip) traz também status_estilo e pendencias.
import type { Config } from "./config.ts";
import { type Campos, normRef, texto } from "./contrato.ts";

interface ItemCatalogo {
	id: string;
	produto?: Record<string, unknown>;
	info?: Record<string, unknown>;
	data?: Record<string, unknown>;
	revisao?: { por?: string; data?: string } | null;
	status_estilo?: string;
	pendencias?: string;
}

export interface ProdutoGerador {
	ref: string;
	nome: string;
	familia: string;
	categoria: string;
	colecao: string;
	cores: string[];
	campos: Campos;
	estilo: { validado: boolean; texto: string };
	pendencias: string[];
	composicaoEstimada: boolean;
	pesoEstimado: boolean;
	linkGerador: string;
}

let cache: { url: string; em: number; itens: ProdutoGerador[] } | undefined;
const TTL = 60_000;

export async function catalogo(cfg: Config): Promise<ProdutoGerador[]> {
	if (cache && cache.url === cfg.catalogoUrl && Date.now() - cache.em < TTL)
		return cache.itens;
	const res = await fetch(cfg.catalogoUrl, {
		signal: AbortSignal.timeout(30_000),
	});
	if (!res.ok)
		throw new Error(`Gerador: ${cfg.catalogoUrl} respondeu ${res.status}`);
	const itens = ((await res.json()) as ItemCatalogo[])
		.map((i) => paraProduto(i, cfg.catalogoUrl))
		.filter((p): p is ProdutoGerador => !!p);
	cache = { url: cfg.catalogoUrl, em: Date.now(), itens };
	return itens;
}

function paraProduto(i: ItemCatalogo, url: string): ProdutoGerador | null {
	const ref = normRef(i.produto?.referencia ?? i.id);
	if (!ref) return null;
	const campos: Campos = Object.fromEntries(
		Object.entries(i.data ?? {})
			.filter(([, v]) => typeof v === "string" || typeof v === "number")
			.map(([k, v]) => [k, String(v)]),
	);
	const status = texto(i.status_estilo);
	const validado = status ? /validad|aprovad/i.test(status) : !!i.revisao?.data;
	const pendencias = texto(i.pendencias)
		.split(/\s*;\s*/)
		.filter(Boolean);
	return {
		ref,
		nome: texto(i.produto?.nome ?? campos.nome),
		familia: texto(i.produto?.familia ?? i.info?.familia),
		categoria: texto(i.produto?.categoria ?? i.info?.categoria),
		colecao: texto(i.info?.colecao),
		cores: Array.isArray(i.info?.cores) ? (i.info.cores as string[]) : [],
		campos,
		estilo: {
			validado,
			texto:
				status ||
				(i.revisao?.data
					? `Validado pelo ${i.revisao.por ?? "Estilo"} em ${i.revisao.data.split("-").reverse().join("/")}`
					: "Em revisão pelo Estilo"),
		},
		pendencias,
		// info.composicao_real=false: a composição foi estimada pela IA.
		composicaoEstimada:
			i.info?.composicao_real === false ||
			pendencias.some((p) => /composi[cç][aã]o estimada/i.test(p)),
		// O Gerador estima o peso de todos os produtos (LEIA-ME do pacote).
		pesoEstimado: true,
		linkGerador: `${new URL(url).origin}/#p=${i.id}`,
	};
}
