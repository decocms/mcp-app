// Contrato da PDP: como os campos do Gerador viram Informações da Wake.
// Portado de sprint-deco/scripts/wake-pdp-agent/contrato.mjs, que é o mesmo
// formato que o site lê (src/components/product/pdp/sprint/wakeBlocks.ts).
import { ICONES } from "./icones.ts";

export type Campos = Record<string, string | undefined>;

export const semAcento = (s: unknown) =>
	String(s ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase();
export const texto = (s: unknown) =>
	String(s ?? "")
		.replace(/\s+/g, " ")
		.trim();

// Referência Sprint: "84.00021". Aceita "84-00021", "8400021", "84.00021_SPT002_4".
export function normRef(v: unknown) {
	const d = texto(v).split("_")[0].replace(/\D/g, "");
	return d.length === 7 ? `${d.slice(0, 2)}.${d.slice(2)}` : null;
}

const PLACEHOLDER =
	/^(\.|-|–|x|n\/?a|na|tbd|a definir|indefinido|pendente|sem|lorem.*|0)$/i;
export const vazio = (v: unknown) => !texto(v) || PLACEHOLDER.test(texto(v));
// Nota no lugar do dado ("Estimado pela IA", "Planilha de compra").
const NOTA =
	/estimad[ao] pela ia|confirmar com (o )?estilo|^planilha de compra$|^estimad[ao]$/i;
export const soNota = (v: unknown) => NOTA.test(texto(v));
const valido = (v: unknown) => !vazio(v) && !soNota(v);

// Nível na escala 1–5. Aceita "4", "4/5", "80%", "●●●●○", "★★★", "alta".
const PALAVRAS: [RegExp, number][] = [
	[/^muito baix[ao]$|^minim[ao]$/, 1],
	[/^baix[ao]$|^pouc[ao]$/, 2],
	[/^medi[ao]$|^moderad[ao]$|^regular$/, 3],
	[/^alt[ao]$|^boa$|^bom$/, 4],
	[/^muito alt[ao]$|^maxim[ao]$|^excelente$/, 5],
];
const num = (s: string) => Number.parseFloat(s.replace(",", "."));
export function normNivel(v: unknown): number | null {
	const s = semAcento(texto(v));
	if (!s) return null;
	const cheios = (s.match(/[●★■▰]/g) ?? []).length;
	if (cheios) return cheios <= 5 ? cheios : null;
	let m = s.match(/^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+)$/);
	if (m) return Math.round((num(m[1]) / +m[2]) * 5) || null;
	m = s.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
	if (m) return Math.min(5, Math.max(1, Math.round(num(m[1]) / 20)));
	m = s.match(/^(\d+(?:[.,]\d+)?)$/);
	if (m) {
		const n = Math.round(num(m[1]));
		return n >= 1 && n <= 5 ? n : null;
	}
	return PALAVRAS.find(([re]) => re.test(s))?.[1] ?? null;
}

const slug = (s: unknown) =>
	semAcento(s)
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
export const iconeDe = (v: unknown) => (ICONES.has(slug(v)) ? slug(v) : null);

// "83% Poliamida 17% Elastano" e "83% Poliamida / 17% Elastano" são a mesma.
export const composicaoCanonica = (v: unknown) =>
	[
		...semAcento(v).matchAll(
			/(\d+(?:[.,]\d+)?)\s*%\s*([a-z ]+?)(?=\s*(?:\/|,|;|\+|\d|$))/g,
		),
	]
		.map((m) => `${num(m[1])}% ${texto(m[2])}`)
		.sort()
		.join(" + ");

const esc = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s: string) => esc(s).replace(/"/g, "&quot;");
// Texto do Gerador → HTML da Informação (um <p> por parágrafo).
export const paraHtml = (v: unknown) =>
	String(v ?? "")
		.split(/\n\s*\n|\r\n\s*\r\n/)
		.map(texto)
		.filter(Boolean)
		.map((p) => `<p>${esc(p)}</p>`)
		.join("");

// Um bloco é uma Informação da Wake (a loja aceita uma por tipo no produto).
// pronto=false: não sobe, e `motivos` diz o que falta.
export interface Bloco {
	label: string;
	tipoInformacao: string;
	titulo: string;
	texto: string;
	// Trecho que aparece na PDP renderizada (1º nome/título), para conferir o site.
	marca: string;
	pronto: boolean;
	motivos: string[];
	avisos: string[];
	// A Wake já tem um valor real vindo do ERP: diverge = conflito, não sobrescreve.
	protegido?: boolean;
}

const DADOS: [string, string][] = [
	["fit", "Fit"],
	["temperatura", "Temperatura ideal"],
	["condicoes_uso", "Condições de uso"],
];

export interface Entrada {
	campos: Campos;
	composicaoEstimada: boolean;
	pesoEstimado: boolean;
}

export function montarBlocos({
	campos,
	composicaoEstimada,
	pesoEstimado,
}: Entrada): Bloco[] {
	const out: Bloco[] = [];
	const bloco = (
		b: Omit<Bloco, "pronto" | "avisos" | "motivos"> & {
			motivos?: string[];
			avisos?: string[];
		},
	) =>
		out.push({
			...b,
			motivos: b.motivos ?? [],
			avisos: b.avisos ?? [],
			pronto: !b.motivos?.length && !!b.texto,
		});

	// Descrição
	const desc = texto(campos.descricao);
	const motivosDesc: string[] = [];
	if (!valido(desc)) motivosDesc.push("Descrição vazia");
	else if (desc.length < 150)
		motivosDesc.push(`Descrição curta (${desc.length} de no mínimo 150)`);
	bloco({
		label: "Descrição",
		tipoInformacao: "Descricao",
		titulo: "Descrição",
		texto: valido(desc) ? paraHtml(campos.descricao) : "",
		marca: desc.slice(0, 90),
		motivos: motivosDesc,
		avisos:
			desc.length > 900
				? [`Descrição com ${desc.length} caracteres (limite 900)`]
				: [],
	});

	// Composição
	const comp = texto(campos.composicao);
	const motivosComp: string[] = [];
	if (!valido(comp)) motivosComp.push("Composição vazia");
	else {
		if (composicaoEstimada)
			motivosComp.push("Composição estimada pela IA, falta o Estilo confirmar");
		const soma = [...comp.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].reduce(
			(a, m) => a + num(m[1]),
			0,
		);
		if (!soma) motivosComp.push("Composição sem percentuais");
		else if (Math.round(soma) !== 100)
			motivosComp.push(`Composição soma ${soma}%`);
	}
	bloco({
		label: "Composição",
		tipoInformacao: "Composicao",
		titulo: "Composição",
		texto: valido(comp) ? `<p>${esc(comp)}</p>` : "",
		marca: comp,
		motivos: motivosComp,
		protegido: true,
	});

	// Especificações (escala 1–5)
	const especs: { nome: string; nivel: number }[] = [];
	const motivosEsp: string[] = [];
	for (const n of [1, 2, 3]) {
		const nome = campos[`espec_${n}`];
		const bruto = campos[`espec_${n}_nivel`];
		if (!valido(nome) && !valido(bruto)) continue;
		const nivel = normNivel(bruto);
		if (!valido(nome)) motivosEsp.push(`Nome da especificação ${n}`);
		else if (!nivel)
			motivosEsp.push(
				`Nível de "${texto(nome)}" (1 a 5${bruto ? `, veio "${bruto}"` : ""})`,
			);
		else especs.push({ nome: texto(nome), nivel });
	}
	if (especs.length || motivosEsp.length)
		bloco({
			label: "Especificações",
			tipoInformacao: "Especificacoes",
			titulo: "Especificações técnicas",
			marca: especs[0]?.nome ?? "",
			texto: especs.length
				? `<ul>${especs.map((e) => `<li data-nivel="${e.nivel}">${esc(e.nome)}: ${e.nivel}</li>`).join("")}</ul>`
				: "",
			motivos: motivosEsp,
		});

	// Benefícios (título + texto + ícone da cartela)
	const bens: { titulo: string; texto: string; icone: string | null }[] = [];
	const motivosBen: string[] = [];
	const avisosBen: string[] = [];
	for (const n of [1, 2, 3]) {
		const titulo = campos[`beneficio_${n}_titulo`];
		const corpo = campos[`beneficio_${n}_texto`];
		const icone = campos[`beneficio_${n}_icone`];
		if (!valido(titulo) && !valido(corpo)) continue;
		if (!valido(titulo) || !valido(corpo)) {
			motivosBen.push(
				`Benefício ${n}: falta ${valido(titulo) ? "texto" : "título"}`,
			);
			continue;
		}
		const chave = iconeDe(icone) ?? iconeDe(titulo);
		if (!chave)
			avisosBen.push(
				`Benefício ${n} sem ícone reconhecido${icone ? ` ("${icone}")` : ""}`,
			);
		bens.push({ titulo: texto(titulo), texto: texto(corpo), icone: chave });
	}
	if (!bens.length && !motivosBen.length) motivosBen.push("Nenhum benefício");
	bloco({
		label: "Benefícios",
		tipoInformacao: "Beneficios",
		titulo: "Benefícios",
		marca: bens[0]?.titulo ?? "",
		texto: bens.length
			? `<ul>${bens.map((b) => `<li${b.icone ? ` data-icone="${attr(b.icone)}"` : ""}><strong>${esc(b.titulo)}</strong> ${esc(b.texto)}</li>`).join("")}</ul>`
			: "",
		motivos: motivosBen,
		avisos: avisosBen,
	});

	// Dados técnicos (peso só quando não é estimado)
	const dados = [
		...(pesoEstimado ? [] : ([["peso", "Peso"]] as [string, string][])),
		...DADOS,
	]
		.filter(([k]) => valido(campos[k]))
		.map(([k, label]) => ({ k, label, valor: texto(campos[k]) }));
	if (dados.length)
		bloco({
			label: "Dados técnicos",
			tipoInformacao: "DadosTecnicos",
			titulo: "Dados técnicos",
			marca: dados[0].valor,
			texto: `<ul>${dados.map((d) => `<li data-campo="${d.k}"><strong>${esc(d.label)}</strong> ${esc(d.valor)}</li>`).join("")}</ul>`,
			avisos:
				pesoEstimado && valido(campos.peso)
					? ["Peso estimado pela IA: não enviado"]
					: [],
		});

	return out;
}

// Comparação tolerante ao HTML: o começo do texto basta para saber se é o mesmo.
export const plano = (html: unknown) =>
	texto(
		semAcento(
			String(html ?? "")
				.replace(/<[^>]+>/g, " ")
				.replace(/&nbsp;/g, " ")
				.replace(/&quot;/g, '"')
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">")
				.replace(/&amp;/g, "&"),
		),
	);
export const mesmoTexto = (a: unknown, b: unknown) =>
	plano(a).slice(0, 200) === plano(b).slice(0, 200);
