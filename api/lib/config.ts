import type { AppContext } from "@decocms/runtime/tools";
import type { State } from "../types/env.ts";

export interface Config {
	wakeToken?: string;
	adminToken?: string;
	catalogoUrl: string;
	siteUrl: string;
	refsLiberadas: Set<string> | "todas";
}

const pick = (state: State | undefined, key: keyof State) =>
	state?.[key]?.trim() || undefined;

// runtimeContext é o contexto por requisição: o state vem da conexão no Studio,
// que guarda os tokens criptografados. Não há fallback para variáveis de
// ambiente: com o servidor exposto (deco link, deploy), quem chamasse sem
// conexão usaria os tokens da máquina.
export function config(runtimeContext?: AppContext): Config {
	const state = (
		runtimeContext?.env as { MESH_REQUEST_CONTEXT?: { state?: State } }
	)?.MESH_REQUEST_CONTEXT?.state;
	const refs = pick(state, "REFS_LIBERADAS") ?? "";
	return {
		wakeToken: pick(state, "WAKE_TOKEN"),
		adminToken: pick(state, "WAKE_ADMIN_TOKEN"),
		catalogoUrl:
			pick(state, "CATALOGO_URL") ??
			"https://sprint-pdp.vercel.app/catalogo.json",
		siteUrl: (
			pick(state, "SITE_URL") ?? "https://sprint.deco-cx.workers.dev"
		).replace(/\/$/, ""),
		refsLiberadas:
			refs === "*"
				? "todas"
				: new Set(
						refs
							.split(",")
							.map((r) => r.trim())
							.filter(Boolean),
					),
	};
}

export const liberada = (cfg: Config, ref: string) =>
	cfg.refsLiberadas === "todas" || cfg.refsLiberadas.has(ref);
