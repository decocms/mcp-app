// Wake: leitura pela Storefront API (WAKE_TOKEN) e escrita pela API Admin
// (WAKE_ADMIN_TOKEN). Uma Informação mudada só aparece na Storefront depois
// de "Indexar Agora" no painel (não há API para isso).
import type { Config } from "./config.ts";
import { normRef } from "./contrato.ts";

export interface VarianteWake {
	productId: number;
	productVariantId: number;
	productName: string;
	sku: string;
	alias: string;
	available: boolean;
	informations: { type: string; title: string; value: string }[] | null;
	attributes: { name: string; value: string }[] | null;
}

// Por token: cada conexão do Studio (loja) tem o seu catálogo.
const cache = new Map<
	string,
	{ em: number; porRef: Map<string, VarianteWake[]> }
>();
const TTL = 60_000;

export async function variantesPorRef(
	cfg: Config,
	{ fresco = false } = {},
): Promise<Map<string, VarianteWake[]>> {
	if (!cfg.wakeToken)
		throw new Error(
			"Falta o Token Storefront da Wake na configuração da conexão.",
		);
	const salvo = cache.get(cfg.wakeToken);
	if (!fresco && salvo && Date.now() - salvo.em < TTL) return salvo.porRef;
	const query = `query($after: String) {
    products(filters: { ignoreDisplayRules: true }, first: 50, sortDirection: ASC, sortKey: NAME, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { productId productVariantId productName sku alias available
        informations { type title value } attributes { name value } }
    }
  }`;
	const porRef = new Map<string, VarianteWake[]>();
	for (let after: string | null = null; ; ) {
		const res = await fetch("https://storefront-api.fbits.net/graphql", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"TCS-Access-Token": cfg.wakeToken,
			},
			body: JSON.stringify({ query, variables: { after } }),
		});
		const j = (await res.json()) as {
			errors?: unknown;
			data: {
				products: {
					pageInfo: { hasNextPage: boolean; endCursor: string };
					nodes: VarianteWake[];
				};
			};
		};
		if (j.errors) throw new Error(`Wake: ${JSON.stringify(j.errors)}`);
		for (const v of j.data.products.nodes) {
			const ref = normRef(v.sku);
			if (!ref) continue;
			porRef.set(ref, [...(porRef.get(ref) ?? []), v]);
		}
		if (!j.data.products.pageInfo.hasNextPage) break;
		after = j.data.products.pageInfo.endCursor;
	}
	cache.set(cfg.wakeToken, { em: Date.now(), porRef });
	return porRef;
}

export const corDa = (v: VarianteWake) =>
	v.attributes?.find((a) => /^cor$/i.test(a.name))?.value;

// Uma variante por produto da Wake (cor): as Informações são do produto.
export const produtosDa = (vs: VarianteWake[]) => [
	...new Map(vs.map((v) => [v.productId, v])).values(),
];

// ── Admin ──────────────────────────────────────────────
export interface InformacaoAdmin {
	informacaoId: number;
	tipoInformacao: string;
	titulo: string;
	texto: string;
	exibirSite: boolean;
}

async function admin<T>(
	cfg: Config,
	method: string,
	path: string,
	body?: unknown,
): Promise<T> {
	if (!cfg.adminToken)
		throw new Error(
			"Falta o Token da API Admin da Wake na configuração da conexão.",
		);
	const res = await fetch(`https://api.fbits.net${path}`, {
		method,
		headers: {
			"content-type": "application/json",
			accept: "application/json",
			Authorization: `Basic ${cfg.adminToken}`,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const t = await res.text();
	if (!res.ok)
		throw new Error(`Wake Admin ${method} → ${res.status} ${t.slice(0, 300)}`);
	try {
		return JSON.parse(t) as T;
	} catch {
		return t as T;
	}
}
const infoPath = (sku: string, id?: number) =>
	`/produtos/${encodeURIComponent(sku)}/informacoes${id ? `/${id}` : ""}?tipoIdentificador=Sku`;

export const informacoesAdmin = (cfg: Config, sku: string) =>
	admin<InformacaoAdmin[]>(cfg, "GET", infoPath(sku));

export interface Acao {
	sku: string;
	productId: number;
	tipoInformacao: string;
	titulo: string;
	acao: "criado" | "atualizado" | "igual";
	informacaoId?: number;
	anterior?: Omit<InformacaoAdmin, "informacaoId">;
}

// A Wake aceita uma Informação por tipo no produto: a existente é achada pelo tipo.
export async function gravarInformacao(
	cfg: Config,
	v: VarianteWake,
	atuais: InformacaoAdmin[],
	{
		tipoInformacao,
		titulo,
		texto,
	}: { tipoInformacao: string; titulo: string; texto: string },
): Promise<Acao> {
	const base = { sku: v.sku, productId: v.productId, tipoInformacao, titulo };
	const atual = atuais.find((i) => i.tipoInformacao === tipoInformacao);
	const corpo = { tipoInformacao, titulo, texto, exibirSite: true };
	if (atual && atual.texto === texto) return { ...base, acao: "igual" };
	if (atual) {
		await admin(cfg, "PUT", infoPath(v.sku, atual.informacaoId), corpo);
		const { informacaoId, ...anterior } = atual;
		return { ...base, acao: "atualizado", informacaoId, anterior };
	}
	const id = await admin<number>(
		cfg,
		"POST",
		`${infoPath(v.sku)}&tipoRetorno=Id`,
		corpo,
	);
	return { ...base, acao: "criado", informacaoId: Number(id) };
}

export async function desfazer(cfg: Config, a: Acao) {
	if (a.acao === "criado" && a.informacaoId)
		await admin(cfg, "DELETE", infoPath(a.sku, a.informacaoId));
	if (a.acao === "atualizado" && a.informacaoId && a.anterior)
		await admin(cfg, "PUT", infoPath(a.sku, a.informacaoId), a.anterior);
}

// ── Site ───────────────────────────────────────────────
export const urlDoSite = (cfg: Config, v: VarianteWake) =>
	`${cfg.siteUrl}/produto/${v.alias}?skuId=${v.productVariantId}`;

export async function paginaDoSite(cfg: Config, v: VarianteWake) {
	const url = urlDoSite(cfg, v);
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
		// Só o que é renderizado: os dados de hidratação (<script>) trazem o
		// produto inteiro mesmo quando a PDP mostra outra coisa.
		const html = (await res.text()).replace(
			/<script\b[\s\S]*?<\/script>/gi,
			" ",
		);
		// A loja responde 200 com a página "Page not found" quando não acha o produto.
		const naoAchou = /page not found|p[aá]gina n[aã]o encontrada/i.test(html);
		return { url, status: naoAchou ? 404 : res.status, html };
	} catch (err) {
		return { url, status: 0, html: "", erro: (err as Error).message };
	}
}
