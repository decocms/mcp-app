import { describe, expect, test } from "bun:test";
import { config, liberada } from "./config.ts";
import { montarBlocos, normNivel, normRef } from "./contrato.ts";

describe("normNivel", () => {
	test("aceita os formatos da planilha", () => {
		expect(normNivel("4")).toBe(4);
		expect(normNivel("4/5")).toBe(4);
		expect(normNivel("80%")).toBe(4);
		expect(normNivel("●●●○○")).toBe(3);
		expect(normNivel("muito alta")).toBe(5);
		expect(normNivel("7")).toBeNull();
	});
});

test("normRef usa a Referência como chave", () => {
	expect(normRef("84-00021")).toBe("84.00021");
	expect(normRef("84.00116_SPT068_1")).toBe("84.00116");
	expect(normRef("abc")).toBeNull();
});

describe("montarBlocos", () => {
	const campos = {
		descricao: "x".repeat(200),
		composicao: "84% Poliamida / 16% Elastano",
		espec_1: "Respirabilidade",
		espec_1_nivel: "4/5",
		beneficio_1_titulo: "Proteção UV50+",
		beneficio_1_texto: "Filtro UV no tecido.",
		peso: "180 g",
		fit: "Ajustado",
	};

	test("composição estimada não sobe", () => {
		const b = montarBlocos({
			campos,
			composicaoEstimada: true,
			pesoEstimado: true,
		});
		const comp = b.find((x) => x.tipoInformacao === "Composicao");
		expect(comp?.pronto).toBe(false);
		expect(b.find((x) => x.tipoInformacao === "Descricao")?.pronto).toBe(true);
	});

	test("blocos no formato que o site lê", () => {
		const b = montarBlocos({
			campos,
			composicaoEstimada: false,
			pesoEstimado: true,
		});
		expect(b.find((x) => x.tipoInformacao === "Especificacoes")?.texto).toBe(
			'<ul><li data-nivel="4">Respirabilidade: 4</li></ul>',
		);
		expect(b.find((x) => x.tipoInformacao === "Beneficios")?.texto).toContain(
			'data-icone="protecao-uv50"',
		);
		const dados = b.find((x) => x.tipoInformacao === "DadosTecnicos");
		expect(dados?.texto).not.toContain("180 g");
	});
});

test("envio só para referências liberadas", () => {
	const env = (REFS_LIBERADAS: string) =>
		({ env: { MESH_REQUEST_CONTEXT: { state: { REFS_LIBERADAS } } } }) as never;
	const vazio = config(env(""));
	expect(liberada(vazio, "84.00021")).toBe(false);
	expect(vazio.adminToken).toBeUndefined();
	expect(liberada(config(env("84.00021")), "84.00021")).toBe(true);
	expect(liberada(config(env("*")), "27.00019")).toBe(true);
});
