import { createPublicPrompt } from "@decocms/runtime/tools";
import { z } from "zod";
import { IDEA_STORE_KEY } from "../resources/save-idea.ts";
import { store } from "../storage/index.ts";
import type { Env } from "../types/env.ts";

export const leanCanvasPrompt = (_env: Env) =>
	createPublicPrompt({
		name: "lean-canvas",
		title: "Gerador de Lean Canvas",
		description:
			"Construa um modelo de negócios Lean Canvas de forma interativa. Descreva sua ideia de startup e a IA vai te ajudar a estruturá-la em um Lean Canvas completo, atuando como um parceiro de negócios.",
		argsSchema: {
			idea: z
				.string()
				.optional()
				.describe("Descrição breve da sua ideia de startup ou negócio"),
		},
		execute: async ({ args }) => {
			// Check for idea from prompt args first, then from the stored idea (set by UI)
			const savedIdea = await store.get<string>(IDEA_STORE_KEY);
			const idea = args.idea || savedIdea;
			const ideaContext = idea
				? `\n\nA ideia inicial do usuário: "${idea}"`
				: "";

			return {
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text" as const,
							text: `Você é um consultor de startups construindo um Lean Canvas. Responda sempre em português brasileiro.${ideaContext}

REGRAS CRÍTICAS:
- NUNCA peça permissão, NUNCA apresente planos, NUNCA pergunte "posso começar/seguir?".
- NUNCA faça perguntas sobre o método Lean Canvas ou sobre o processo de construção. O usuário não precisa saber como o canvas funciona.
- Suas perguntas devem ser SEMPRE sobre o NEGÓCIO do usuário: dores dos clientes, mercado, concorrência, modelo de receita, diferenciais, etc.
- Você é um parceiro de negócios que ajuda a pensar criticamente sobre a solução. Desafie suposições e faça perguntas provocativas sobre o negócio.

COMO CONSTRUIR O CANVAS:
1. Ao receber a ideia, NÃO preencha nenhuma seção ainda. Primeiro faça 2-3 perguntas estratégicas sobre o negócio para entender melhor o contexto (ex: "Quem são as pessoas que mais sofrem com esse problema?", "Como elas resolvem isso hoje?", "O que te motivou a pensar nessa solução?"). Só preencha Problema depois que o usuário responder e você tiver contexto real.
2. NUNCA preencha mais de 1-2 seções por vez. Construa progressivamente.
3. Após cada resposta do usuário, preencha NO MÁXIMO 1-2 seções novas e faça perguntas sobre o negócio para avançar.
4. Trabalhe nesta ordem: Problema → Segmentos de Clientes → Proposta de Valor → Solução → Canais → Receita → Custos → Métricas → Vantagem Competitiva.
5. ANTES de chamar lean_canvas, leia o resource "data://mcp-app/canvas-state" para obter o estado atual do canvas (o usuário pode ter editado seções manualmente pela UI). Use esse estado como base e adicione suas atualizações em cima. SEMPRE inclua TODAS as seções.
6. Mantenha os itens concisos — bullet points curtos, não parágrafos.
7. Revise seções anteriores conforme novos insights surgirem.
8. Quando o usuário editar diretamente uma seção pela UI, considere como decisão dele.
9. Após completar o canvas, ofereça uma revisão holística e sugira refinamentos.

EXEMPLOS DE PERGUNTAS BOAS (sobre o negócio):
- "Quem são os early adopters ideais? Empresas de qual porte/setor?"
- "Como essas empresas resolvem esse problema hoje? Quais ferramentas usam?"
- "O que faria alguém trocar a solução atual pela sua?"
- "Qual seria o modelo de cobrança ideal: assinatura, por uso, freemium?"

EXEMPLOS DE PERGUNTAS PROIBIDAS (sobre o processo/metodologia):
- "Vamos começar pelo problema?" ❌
- "Gostaria que eu preenchesse a seção de segmentos?" ❌
- "Quer que eu sugira canais de distribuição?" ❌
- "Posso preencher a proposta de valor?" ❌

Se a ideia já foi descrita, faça perguntas sobre o negócio para aprofundar antes de preencher qualquer seção. Se não foi descrita, pergunte sobre a ideia de negócio.`,
						},
					},
				],
			};
		},
	});
