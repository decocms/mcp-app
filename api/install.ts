// Instalação no Studio: na primeira vez que a conexão é configurada, cria o
// agente "Gerador de PDP" (ícone na tela inicial) e fixa o painel como o
// item do menu lateral e a tela principal dele. Tudo pela API do próprio
// Studio, com o token da conexão.
import { createMCPFetchStub, proxyConnectionForId } from "@decocms/runtime";
import { AGENT_SCOPES, type InstallContext } from "@decocms/runtime/tools";
import { PDP_PAINEL_TOOL } from "./tools/pdp-painel.ts";
import type { Env } from "./types/env.ts";

export const AGENTE = "Gerador de PDP";

export const INSTALL_SCOPES = [
	...AGENT_SCOPES,
	"SELF::VIRTUAL_MCP_PINNED_VIEWS_UPDATE",
];

const INSTRUCOES = `Você ajuda o time da Sprint a levar a copy do Gerador de PDP para a Wake.

- Para ver o que existe e o que pode subir, use pdp_painel. Para um produto, pdp_detalhe com a Referência (ex.: 84.00021).
- Antes de qualquer envio, rode pdp_publicar com simular: true e mostre o que seria gravado em cada cor.
- Só rode pdp_publicar sem simular quando uma pessoa pedir o envio daquele produto nesta conversa, ou quando você estiver trabalhando num card na coluna Ready for Deployment. Nunca envie em lote por conta própria.
- Depois de enviar, guarde o campo acoes no comentário ou na resposta: é o que pdp_desfazer usa para voltar atrás.
- O site só mostra a mudança depois de "Indexar Agora" no painel da Wake (não há API). Avise isso e, depois, confira com pdp_detalhe.
- Nunca altere a copy: ela é validada pelo Estilo no Gerador. Se um bloco está bloqueado, explique o motivo e quem precisa agir.`;

interface StudioSelf {
	VIRTUAL_MCP_PINNED_VIEWS_UPDATE: (input: {
		virtualMcpId: string;
		pinnedViews: {
			connectionId: string;
			toolName: string;
			label: string;
			icon?: string | null;
		}[];
		layout?: {
			defaultMainView?: { type: string; id?: string; toolName?: string };
			chatDefaultOpen?: boolean;
		};
	}) => Promise<unknown>;
}

export async function onInstall(env: Env, { createAgent }: InstallContext) {
	const ctx = env.STUDIO_REQUEST_CONTEXT;
	const agente = await createAgent({
		name: AGENTE,
		description:
			"Copy do Gerador de PDP da Sprint → Informações da Wake, com o status do deploy.",
		instructions: INSTRUCOES,
	});
	if (!ctx.connectionId) return;
	const self = createMCPFetchStub({
		connection: proxyConnectionForId("self", {
			studioUrl: ctx.studioUrl,
			token: ctx.token,
		}),
	}) as unknown as StudioSelf;
	await self.VIRTUAL_MCP_PINNED_VIEWS_UPDATE({
		virtualMcpId: agente.id,
		pinnedViews: [
			{
				connectionId: ctx.connectionId,
				toolName: PDP_PAINEL_TOOL,
				label: AGENTE,
				icon: "file-text",
			},
		],
		layout: {
			defaultMainView: {
				type: "ext-apps",
				id: ctx.connectionId,
				toolName: PDP_PAINEL_TOOL,
			},
			chatDefaultOpen: true,
		},
	});
}
