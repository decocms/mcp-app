import type { LeanCanvasOutput } from "../../../api/tools/lean-canvas.ts";

const SECTION_LABELS: Record<string, string> = {
	problem: "Problema",
	customerSegments: "Segmentos de Clientes",
	uniqueValueProposition: "Proposta de Valor Única",
	solution: "Solução",
	channels: "Canais",
	revenueStreams: "Fontes de Receita",
	costStructure: "Estrutura de Custos",
	keyMetrics: "Métricas-Chave",
	unfairAdvantage: "Vantagem Competitiva",
};

const SECTION_ORDER = [
	"problem",
	"customerSegments",
	"uniqueValueProposition",
	"solution",
	"channels",
	"revenueStreams",
	"costStructure",
	"keyMetrics",
	"unfairAdvantage",
] as const;

type SectionKey = (typeof SECTION_ORDER)[number];

function getSectionItems(data: LeanCanvasOutput, key: SectionKey): string[] {
	const section = data[key];
	if (section && "items" in section && Array.isArray(section.items)) {
		return section.items;
	}
	return [];
}

function getSectionNote(
	data: LeanCanvasOutput,
	key: SectionKey,
): string | undefined {
	const section = data[key];
	if (section && "note" in section) {
		return section.note;
	}
	return undefined;
}

export function exportToMarkdown(data: LeanCanvasOutput): string {
	const lines: string[] = [];
	lines.push(`# Lean Canvas — ${data.projectName ?? "Projeto sem título"}`);
	lines.push("");

	for (const key of SECTION_ORDER) {
		const items = getSectionItems(data, key);
		const note = getSectionNote(data, key);
		lines.push(`## ${SECTION_LABELS[key]}`);
		if (items.length > 0) {
			for (const item of items) {
				lines.push(`- ${item}`);
			}
		} else {
			lines.push("_Seção vazia_");
		}
		if (note) {
			lines.push("");
			lines.push(`> ${note}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function downloadMarkdown(data: LeanCanvasOutput) {
	const md = exportToMarkdown(data);
	const name = (data.projectName ?? "lean-canvas")
		.toLowerCase()
		.replace(/\s+/g, "-");
	downloadFile(md, `${name}.md`, "text/markdown");
}

export function downloadPdf(data: LeanCanvasOutput) {
	const name = data.projectName ?? "Lean Canvas";
	const safeName = name.toLowerCase().replace(/\s+/g, "-");

	const sectionsHtml = SECTION_ORDER.map((key) => {
		const items = getSectionItems(data, key);
		const note = getSectionNote(data, key);
		const itemsHtml =
			items.length > 0
				? `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
				: '<p class="empty">Seção vazia</p>';
		const noteHtml = note ? `<blockquote>${escapeHtml(note)}</blockquote>` : "";
		return `<div class="section"><h2>${escapeHtml(SECTION_LABELS[key])}</h2>${itemsHtml}${noteHtml}</div>`;
	}).join("");

	const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(name)}</title>
<style>
  @page { margin: 1.5cm; size: A4 landscape; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
  h1 { text-align: center; margin-bottom: 24px; font-size: 22px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .section { border: 1px solid #D9D9D7; border-radius: 8px; padding: 12px; break-inside: avoid; }
  .section h2 { font-size: 13px; margin: 0 0 8px 0; padding: 2px 8px; border-radius: 4px; background: #f3f4f6; display: inline-block; }
  .section ul { margin: 0; padding-left: 18px; font-size: 12px; }
  .section li { margin-bottom: 4px; }
  .section .empty { font-size: 12px; color: #999; font-style: italic; }
  .section blockquote { font-size: 11px; color: #666; border-left: 2px solid #ddd; margin: 8px 0 0; padding-left: 8px; }
</style>
</head>
<body>
<h1>Lean Canvas — ${escapeHtml(name)}</h1>
<div class="grid">${sectionsHtml}</div>
</body>
</html>`;

	const printWindow = window.open("", "_blank");
	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.onload = () => {
			printWindow.print();
		};
		// Fallback if onload doesn't fire (already loaded)
		setTimeout(() => {
			printWindow.print();
		}, 500);
	} else {
		// Fallback: download as HTML
		downloadFile(html, `${safeName}.html`, "text/html");
	}
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
