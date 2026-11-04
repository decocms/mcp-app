import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPublicResource } from "@decocms/runtime/tools";
import { PDP_DETALHE_RESOURCE_URI } from "../tools/pdp-detalhe.ts";
import { PDP_PAINEL_RESOURCE_URI } from "../tools/pdp-painel.ts";
import type { Env } from "../types/env.ts";

const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

function getDistPath(): string {
	const projectRoot = join(import.meta.dir, "../..");
	return join(projectRoot, "dist", "client", "index.html");
}

// Uma resource por tool com UI, todas servindo o mesmo bundle: o router do
// bundle escolhe a página pelo toolName.
const appResource =
	(uri: string, name: string, description: string) => (_env: Env) =>
		createPublicResource({
			uri,
			name,
			description,
			mimeType: RESOURCE_MIME_TYPE,
			read: async () => ({
				uri,
				mimeType: RESOURCE_MIME_TYPE,
				text: await readFile(getDistPath(), "utf-8"),
			}),
		});

export const pdpPainelAppResource = appResource(
	PDP_PAINEL_RESOURCE_URI,
	"Deploy de PDP",
	"Painel Gerador de PDP → Wake → site da Sprint",
);

export const pdpDetalheAppResource = appResource(
	PDP_DETALHE_RESOURCE_URI,
	"Deploy de PDP · produto",
	"Blocos de uma Referência e o status do deploy por cor",
);
