import { pdpDesfazerTool } from "./pdp-desfazer.ts";
import { pdpDetalheTool } from "./pdp-detalhe.ts";
import { pdpPainelTool } from "./pdp-painel.ts";
import { pdpPublicarTool } from "./pdp-publicar.ts";

// O Studio abre como app a primeira tool com UI: o painel vem primeiro.
export const tools = [
	pdpPainelTool,
	pdpDetalheTool,
	pdpPublicarTool,
	pdpDesfazerTool,
];
