# Deploy de PDP · Sprint

MCP App para o deco Studio que leva a copy do [Gerador de PDP da Sprint](https://sprint-pdp.vercel.app) (validada pelo Estilo) para as Informações dos produtos na Wake e mostra o status do deploy de cada bloco, em cada cor: **gravado** (API Admin), **indexado** (Storefront) e **no site** (PDP renderizada).

Feito a partir do [template de MCP App](https://github.com/decocms/mcp-app): mesma estrutura, mesmo build, mesmo CI.

## Tools

| Tool | UI | O que faz |
|------|----|-----------|
| `pdp_painel` | sim | Cruza o Gerador com a Wake e mostra o status de cada Referência. É o app que o Studio abre ao conectar. |
| `pdp_detalhe` | sim | Blocos de uma Referência (Descrição, Composição, Especificações, Benefícios, Dados técnicos), o que falta e a matriz de deploy por cor. |
| `pdp_publicar` | não | Grava na Wake os blocos prontos. Exige `confirmar: true`, Estilo validado, produto na Wake e Referência liberada. Não sobrescreve Composição do ERP divergente. Devolve `acoes`. Com `simular: true`, só devolve o `plano` (o que seria criado/atualizado em cada cor) e os `avisos` do que impediria o envio. |
| `pdp_desfazer` | não | Recebe as `acoes` de um envio e apaga o que foi criado / volta o que foi atualizado. |

Na UI, o painel abre o detalhe em `/produto/<ref>`; no Studio essa rota vira o argumento `_route` da view e sobrevive a um reload. O detalhe chama `pdp_publicar` e `pdp_desfazer` pelo botão (com confirmação) e manda o produto aberto como contexto para o agente.

## Instalação no Studio

Na primeira vez que a conexão é configurada (`onInstall`, `api/install.ts`), o app usa a API do próprio Studio para criar o agente **Gerador de PDP**: ele aparece com ícone na tela inicial, já com as tools desta conexão e instruções de uso. O painel fica fixado como item do menu lateral e como tela principal do agente, com o chat aberto ao lado. Os escopos pedidos (`SELF::COLLECTION_VIRTUAL_MCP_*`, `SELF::AUTOMATION_*`, `SELF::VIRTUAL_MCP_PINNED_VIEWS_UPDATE`) aparecem na instalação.

Reinstalar não duplica: um agente com o mesmo nome é reaproveitado.

## Configuração (na conexão do Studio)

Os valores ficam na conexão (**Settings → Connections**), guardados pelo Studio. O servidor não lê tokens de variáveis de ambiente: com ele exposto, quem chamasse sem conexão não pode usar os tokens de ninguém.

| Campo | Para quê |
|-------|----------|
| Token Storefront da Wake | Leitura (obrigatório). |
| Token da API Admin da Wake | Escrita. Sem ele, o app só lê. |
| Referências liberadas para envio | Trava de teste: vazio bloqueia todo envio; `84.00021, 27.00019` libera só essas; `*` libera todas. |
| catalogo.json do Gerador | Padrão `https://sprint-pdp.vercel.app/catalogo.json`. |
| Site para conferir a PDP | Padrão `https://sprint.deco-cx.workers.dev`. |

Toda mudança de Informação só aparece no site depois de **Indexar Agora** no painel da Wake (não há API para isso); o app avisa quando um bloco está gravado e não indexado.

## Desenvolvimento

```bash
bun install
bun run dev          # API em http://localhost:3001/api/mcp + build da UI em watch
bun start            # o mesmo, exposto por um túnel do deco link
```

Para testar no Studio: **Settings → Connections → Add connection → Custom Connection**, tipo **HTTP**, com a URL do túnel terminando em `/api/mcp`. Preencha a configuração e anexe a conexão a um agente.

```bash
bun run check        # TypeScript
bun run ci:check     # Biome
bun test             # contrato dos blocos e trava de envio
bun run build        # dist/client/index.html + dist/server/main.js
```

## Estrutura

```
api/
├── lib/
│   ├── contrato.ts   # Gerador → blocos no formato que a PDP do site lê
│   ├── gerador.ts    # catalogo.json do Gerador
│   ├── wake.ts       # Storefront (leitura) e API Admin (escrita)
│   ├── pdp.ts        # status do produto e do deploy por bloco e cor
│   └── config.ts     # configuração da conexão
├── tools/            # pdp-painel, pdp-detalhe, pdp-publicar, pdp-desfazer
├── resources/pdp.ts  # UI das duas tools com UI (mesmo bundle)
└── prompts/          # deploy_pdp_sprint
web/
├── hooks/use-tool.ts # resultado do host ou callServerTool, via TanStack Query
├── tools/pdp-painel/
├── tools/pdp-detalhe/
└── router.tsx        # toolName → página; /painel e /produto/$ref
```
