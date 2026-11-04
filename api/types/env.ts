import type { DefaultEnv } from "@decocms/runtime";
import { z } from "zod";

// Configuração da conexão, preenchida no deco Studio (Settings → Connections).
// O Studio guarda os valores e os manda em cada chamada; os tokens nunca ficam
// no servidor.
const segredo = (title: string, description: string) =>
	z.string().optional().meta({ title, description, format: "password" });

export const StateSchema = z.object({
	WAKE_TOKEN: segredo(
		"Token Storefront da Wake",
		"TCS-Access-Token da Storefront API: leitura dos produtos e das Informações.",
	),
	WAKE_ADMIN_TOKEN: segredo(
		"Token da API Admin da Wake",
		"Token Basic da API Admin: grava as Informações. Sem ele, o app só lê.",
	),
	REFS_LIBERADAS: z.string().optional().meta({
		title: "Referências liberadas para envio",
		description:
			"Separadas por vírgula (ex.: 84.00021, 27.00019). Vazio bloqueia todo envio; * libera todas.",
	}),
	CATALOGO_URL: z.string().optional().meta({
		title: "catalogo.json do Gerador de PDP",
		description: "Padrão: https://sprint-pdp.vercel.app/catalogo.json",
	}),
	SITE_URL: z.string().optional().meta({
		title: "Site para conferir a PDP",
		description: "Padrão: https://sprint.deco-cx.workers.dev",
	}),
});

export type State = z.infer<typeof StateSchema>;

export type Env = DefaultEnv<typeof StateSchema>;
