import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	ExternalLink,
	Loader2,
	MessageSquare,
	RefreshCw,
	Undo2,
	Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	Carregando,
	EtapaDot,
	Falha,
	Legenda,
	StatusBadge,
	statusLabel,
} from "@/components/pdp/status.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useMcpApp } from "@/context.tsx";
import { useTool, useToolMutation } from "@/hooks/use-tool.ts";
import { cn } from "@/lib/utils.ts";
import type { Etapa } from "../../../api/lib/pdp.ts";
import type { Acao } from "../../../api/lib/wake.ts";
import type { PdpDesfazerInput } from "../../../api/tools/pdp-desfazer.ts";
import type { PdpDetalheOutput } from "../../../api/tools/pdp-detalhe.ts";
import type { PdpPublicarInput } from "../../../api/tools/pdp-publicar.ts";

type Envio = PdpDetalheOutput & {
	acoes: Acao[];
	ignorados: string[];
	erros: string[];
};
type Passo = "ok" | "parcial" | "pendente";

// Situação de uma etapa somando todos os blocos de todas as cores.
function somar(etapas: Etapa[]): Passo {
	if (etapas.length && etapas.every((e) => e === "ok")) return "ok";
	return etapas.some((e) => e === "ok" || e === "diferente")
		? "parcial"
		: "pendente";
}

function Passos({ d }: { d: PdpDetalheOutput }) {
	const celulas = d.deploy.flatMap((w) => w.blocos);
	const passos: { titulo: string; sub: string; estado: Passo }[] = [
		{
			titulo: "Gerador",
			sub: d.estilo.texto,
			estado: d.estilo.validado ? "ok" : "pendente",
		},
		{
			titulo: "Gravado na Wake",
			sub: "API Admin",
			estado: somar(celulas.map((c) => c.gravado)),
		},
		{
			titulo: "Indexado",
			sub: "Storefront da Wake",
			estado: somar(celulas.map((c) => c.indexado)),
		},
		{
			titulo: "No site",
			sub: "PDP renderizada",
			estado: somar(celulas.map((c) => c.noSite)),
		},
	];
	return (
		<ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{passos.map((p, i) => (
				<li
					key={p.titulo}
					className={cn(
						"rounded-lg border p-3",
						p.estado === "ok" && "border-emerald-500/50 bg-emerald-500/5",
						p.estado === "parcial" && "border-amber-500/50 bg-amber-500/5",
					)}
				>
					<div className="flex items-center gap-2 text-sm font-medium">
						<span
							className={cn(
								"flex size-5 items-center justify-center rounded-full text-[11px]",
								p.estado === "ok"
									? "bg-emerald-500 text-white"
									: p.estado === "parcial"
										? "bg-amber-500 text-white"
										: "bg-muted text-muted-foreground",
							)}
						>
							{p.estado === "ok" ? <Check className="size-3" /> : i + 1}
						</span>
						{p.titulo}
					</div>
					<div className="mt-1 text-xs text-muted-foreground">
						{p.estado === "parcial" ? "Parcial · " : ""}
						{p.sub}
					</div>
				</li>
			))}
		</ol>
	);
}

export default function PdpDetalhePage({ referencia }: { referencia: string }) {
	const app = useMcpApp();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const args = useMemo(() => ({ referencia }), [referencia]);
	const detalhe = useTool<PdpDetalheOutput>("pdp_detalhe", args);
	const [confirmando, setConfirmando] = useState(false);
	const [envio, setEnvio] = useState<Envio | null>(null);

	const publicar = useToolMutation<Envio, PdpPublicarInput>(
		"pdp_publicar",
		(r) => {
			setEnvio(r);
			queryClient.setQueryData(["pdp_detalhe", args], r);
		},
	);
	const desfazer = useToolMutation<unknown, PdpDesfazerInput>(
		"pdp_desfazer",
		() => {
			setEnvio(null);
			detalhe.refetch();
		},
	);

	const d = detalhe.data;
	useEffect(() => {
		if (!d) return;
		app
			?.updateModelContext({
				content: [
					{
						type: "text",
						text: `Deploy de PDP aberto em ${d.ref} (${d.nome}): ${statusLabel(d.status)}; ${d.blocosProntos} blocos prontos, ${d.blocosBloqueados} bloqueados; ${d.produtosWake.length} cores na Wake.`,
					},
				],
			})
			.catch(() => {});
	}, [app, d]);

	if (detalhe.cancelado)
		return <p className="p-4 text-sm text-muted-foreground">Cancelado.</p>;
	if (!d) {
		const erro = detalhe.erroHost ?? detalhe.error?.message;
		if (erro) return <Falha texto={erro} onTentar={() => detalhe.refetch()} />;
		return (
			<Carregando
				texto={`Conferindo ${referencia} no Gerador, na Wake e no site…`}
			/>
		);
	}

	const ocupado =
		detalhe.isFetching || publicar.isPending || desfazer.isPending;
	const motivoBloqueio = !d.produtosWake.length
		? "O produto ainda não está cadastrado na Wake."
		: !d.estilo.validado
			? "O Estilo ainda não validou este produto no Gerador."
			: !d.envioConfigurado
				? "Falta o token da API Admin da Wake na configuração da conexão."
				: !d.liberadoParaEnvio
					? "Esta referência não está em Referências liberadas (configuração da conexão)."
					: !d.blocosProntos
						? "Nenhum bloco pronto para enviar."
						: null;
	const alterou = envio?.acoes.filter((a) => a.acao !== "igual") ?? [];
	const erro =
		detalhe.error?.message ??
		publicar.error?.message ??
		desfazer.error?.message;

	return (
		<div className="space-y-5 p-4">
			<header className="space-y-2">
				<Button
					variant="ghost"
					size="sm"
					className="-ml-2"
					onClick={() => navigate({ to: "/painel" })}
				>
					<ArrowLeft />
					Painel
				</Button>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-lg font-semibold">{d.nome}</h1>
						<p className="text-sm text-muted-foreground">
							{d.ref}
							{d.familia ? ` · ${d.familia}` : ""}
							{d.colecao ? ` · ${d.colecao}` : ""}
						</p>
					</div>
					<StatusBadge status={d.status} />
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => app?.openLink({ url: d.linkGerador })}
					>
						<ExternalLink />
						Gerador
					</Button>
					{d.produtosWake.map((w) => (
						<Button
							key={w.productId}
							variant="outline"
							size="sm"
							onClick={() => app?.openLink({ url: w.url })}
						>
							<ExternalLink />
							Site{w.cor ? ` · ${w.cor}` : ""}
						</Button>
					))}
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							app?.sendMessage({
								role: "user",
								content: [
									{
										type: "text",
										text: `Sobre a PDP ${d.ref} (${d.nome}) no Deploy de PDP: explique o que falta para ela subir para a Wake e quem precisa agir.`,
									},
								],
							})
						}
					>
						<MessageSquare />
						Perguntar ao agente
					</Button>
				</div>
			</header>

			{erro ? <Falha texto={erro} /> : null}

			<Passos d={d} />

			{d.deploy.length ? (
				<section className="space-y-2">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="text-sm font-medium">Deploy por bloco</h2>
						<Legenda />
					</div>
					<div className="overflow-x-auto rounded-lg border">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b text-xs text-muted-foreground">
									<th className="p-2 text-left font-normal">Bloco</th>
									{d.deploy.map((w) => (
										<th key={w.productId} className="p-2 text-left font-normal">
											{w.cor || w.sku}
											<div className="text-[10px]">
												gravado · indexado · site
											</div>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{d.deploy[0].blocos.map((b, i) => (
									<tr key={b.tipoInformacao} className="border-b last:border-0">
										<td className="p-2">{b.label}</td>
										{d.deploy.map((w) => {
											const c = w.blocos[i];
											return (
												<td key={w.productId} className="p-2">
													<span className="inline-flex items-center gap-1.5">
														<EtapaDot etapa={c.gravado} titulo="Gravado" />
														<EtapaDot etapa={c.indexado} titulo="Indexado" />
														<EtapaDot etapa={c.noSite} titulo="No site" />
														{c.conflito ? (
															<Badge
																variant="outline"
																className="ml-1 text-[10px]"
															>
																ERP diverge
															</Badge>
														) : null}
													</span>
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{d.deploy.some((w) => w.erroAdmin) ? (
						<p className="text-xs text-destructive">
							{d.deploy.find((w) => w.erroAdmin)?.erroAdmin}
						</p>
					) : null}
					{d.deploy
						.filter((w) => w.paginaStatus != null && w.paginaStatus !== 200)
						.map((w) => (
							<p key={w.productId} className="text-xs text-destructive">
								Site · {w.cor || w.sku}:{" "}
								{w.paginaStatus === 404
									? "a loja respondeu “página não encontrada”."
									: `a página respondeu ${w.paginaStatus || "sem conexão"}.`}
							</p>
						))}
					{d.deploy.some((w) =>
						w.blocos.some((b) => b.gravado === "ok" && b.indexado !== "ok"),
					) ? (
						<p className="rounded-lg bg-amber-500/10 p-3 text-xs">
							{d.indexar}
						</p>
					) : null}
				</section>
			) : null}

			<section className="space-y-2">
				<h2 className="text-sm font-medium">O que o Gerador manda</h2>
				<ul className="space-y-2">
					{d.blocos.map((b) => (
						<li key={b.tipoInformacao} className="rounded-lg border p-3">
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-medium">{b.label}</span>
								<Badge
									variant="secondary"
									className={cn(
										"border-0",
										b.pronto
											? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
											: "bg-red-500/10 text-red-700 dark:text-red-300",
									)}
								>
									{b.pronto ? "Pronto" : "Bloqueado"}
								</Badge>
							</div>
							{b.texto ? (
								<p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
									{b.texto
										.replace(/<li[^>]*>/g, " • ")
										.replace(/<[^>]+>/g, " ")
										.replace(/&amp;/g, "&")
										.replace(/\s+/g, " ")
										.trim()}
								</p>
							) : null}
							{[...b.motivos, ...b.avisos].map((m) => (
								<p
									key={m}
									className={cn(
										"mt-1 text-xs",
										b.motivos.includes(m)
											? "text-destructive"
											: "text-amber-700 dark:text-amber-300",
									)}
								>
									{m}
								</p>
							))}
						</li>
					))}
				</ul>
				{d.pendencias.length ? (
					<p className="text-xs text-muted-foreground">
						Pendências no Gerador: {d.pendencias.join("; ")}
					</p>
				) : null}
			</section>

			{envio ? (
				<section className="space-y-1 rounded-lg border p-3 text-xs">
					<h2 className="text-sm font-medium">Último envio</h2>
					{envio.acoes.map((a) => (
						<p key={`${a.sku}-${a.tipoInformacao}`}>
							{a.sku} · {a.titulo}: {a.acao}
						</p>
					))}
					{envio.ignorados.map((m) => (
						<p key={m} className="text-amber-700 dark:text-amber-300">
							{m}
						</p>
					))}
					{envio.erros.map((m) => (
						<p key={m} className="text-destructive">
							{m}
						</p>
					))}
				</section>
			) : null}

			<footer className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t bg-background py-3">
				{confirmando ? (
					<>
						<span className="text-sm">
							Gravar {d.blocosProntos} blocos em {d.produtosWake.length}{" "}
							{d.produtosWake.length > 1 ? "cores" : "cor"} na Wake?
						</span>
						<Button
							size="sm"
							onClick={() => {
								setConfirmando(false);
								publicar.mutate({ referencia: d.ref, confirmar: true });
							}}
						>
							Confirmar envio
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setConfirmando(false)}
						>
							Cancelar
						</Button>
					</>
				) : (
					<>
						<Button
							size="sm"
							disabled={!!motivoBloqueio || ocupado}
							onClick={() => setConfirmando(true)}
						>
							{publicar.isPending ? (
								<Loader2 className="animate-spin" />
							) : (
								<Upload />
							)}
							Enviar para a Wake
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={ocupado}
							onClick={() => detalhe.refetch()}
						>
							{detalhe.isFetching ? (
								<Loader2 className="animate-spin" />
							) : (
								<RefreshCw />
							)}
							Conferir de novo
						</Button>
						{alterou.length && envio ? (
							<Button
								size="sm"
								variant="outline"
								disabled={ocupado}
								onClick={() =>
									desfazer.mutate({ acoes: envio.acoes, confirmar: true })
								}
							>
								{desfazer.isPending ? (
									<Loader2 className="animate-spin" />
								) : (
									<Undo2 />
								)}
								Desfazer envio
							</Button>
						) : null}
						{motivoBloqueio ? (
							<span className="text-xs text-muted-foreground">
								{motivoBloqueio}
							</span>
						) : null}
					</>
				)}
			</footer>
		</div>
	);
}
