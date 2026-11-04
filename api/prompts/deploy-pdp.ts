import { createPublicPrompt } from "@decocms/runtime/tools";
import type { Env } from "../types/env.ts";

export const deployPdpPrompt = (_env: Env) =>
	createPublicPrompt({
		name: "deploy_pdp_sprint",
		title: "Deploy de PDP Sprint → Wake",
		description: "Abre o painel e mostra o que pode subir para a Wake.",
		execute: async () => ({
			messages: [
				{
					role: "user" as const,
					content: {
						type: "text" as const,
						text: "Abra o painel de PDPs da Sprint (pdp_painel) e me diga quais referências validadas pelo Estilo estão prontas para enviar à Wake e o que falta nas outras.",
					},
				},
			],
		}),
	});
