import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import type { Etapa, StatusProduto } from "../../../api/lib/pdp.ts";

const STATUS: Record<StatusProduto, { label: string; className: string }> = {
	fora_da_wake: {
		label: "Fora da Wake",
		className: "bg-muted text-muted-foreground",
	},
	aguardando_estilo: {
		label: "Aguardando Estilo",
		className:
			"bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
	},
	sem_conteudo: {
		label: "Incompleto",
		className: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
	},
	pronto: {
		label: "Pronto para enviar",
		className: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200",
	},
	publicado: {
		label: "Publicado",
		className:
			"bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
	},
};

export const statusLabel = (s: StatusProduto) => STATUS[s].label;

export function StatusBadge({ status }: { status: StatusProduto }) {
	const s = STATUS[status];
	return (
		<Badge variant="secondary" className={cn("border-0", s.className)}>
			{s.label}
		</Badge>
	);
}

const ETAPA: Record<Etapa, { label: string; dot: string }> = {
	ok: { label: "ok", dot: "bg-emerald-500" },
	diferente: { label: "desatualizado", dot: "bg-amber-500" },
	ausente: { label: "ausente", dot: "bg-muted-foreground/30" },
	nao_verificado: {
		label: "não verificado",
		dot: "border border-muted-foreground/40",
	},
	erro: { label: "erro", dot: "bg-red-500" },
};

export function EtapaDot({ etapa, titulo }: { etapa: Etapa; titulo: string }) {
	return (
		<span
			title={`${titulo}: ${ETAPA[etapa].label}`}
			className={cn("inline-block size-2.5 rounded-full", ETAPA[etapa].dot)}
		/>
	);
}

export function Legenda() {
	return (
		<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
			{(Object.keys(ETAPA) as Etapa[]).map((e) => (
				<span key={e} className="inline-flex items-center gap-1.5">
					<EtapaDot etapa={e} titulo={e} />
					{ETAPA[e].label}
				</span>
			))}
		</div>
	);
}

export function Carregando({ texto }: { texto: string }) {
	return (
		<div className="flex min-h-60 items-center justify-center p-6">
			<div className="flex items-center gap-3 text-muted-foreground">
				<span className="size-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
				<span className="text-sm">{texto}</span>
			</div>
		</div>
	);
}

export function Falha({
	texto,
	onTentar,
}: {
	texto: string;
	onTentar?: () => void;
}) {
	return (
		<div className="m-4 space-y-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
			<p>{texto}</p>
			{onTentar ? (
				<button type="button" className="underline" onClick={onTentar}>
					Tentar de novo
				</button>
			) : null}
		</div>
	);
}
