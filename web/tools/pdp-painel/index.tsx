import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Carregando, Falha, StatusBadge } from "@/components/pdp/status.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useMcpApp, useMcpState } from "@/context.tsx";
import { useTool } from "@/hooks/use-tool.ts";
import type {
	PdpPainelInput,
	PdpPainelOutput,
} from "../../../api/tools/pdp-painel.ts";

type Filtro = NonNullable<PdpPainelInput["filtro"]>;

const FILTROS: { id: Filtro; label: string }[] = [
	{ id: "todos", label: "Todos" },
	{ id: "validados", label: "Validados" },
	{ id: "na_wake", label: "Na Wake" },
	{ id: "prontos", label: "Prontos" },
];

const ARGS = {};

function Numero({ valor, label }: { valor: number; label: string }) {
	return (
		<div className="rounded-lg border p-3">
			<div className="text-2xl font-semibold tabular-nums">{valor}</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	);
}

export default function PdpPainelPage() {
	const navigate = useNavigate();
	const app = useMcpApp();
	// Um recorte pedido pelo agente (pdp_painel com filtro/busca) abre a UI
	// já filtrada; a lista em si é sempre a completa.
	const { toolName, toolInput } = useMcpState<PdpPainelInput>();
	const doAgente = toolName === "pdp_painel" ? toolInput : undefined;
	const [filtro, setFiltro] = useState<Filtro>(doAgente?.filtro ?? "todos");
	const [busca, setBusca] = useState(doAgente?.busca ?? "");
	const painel = useTool<PdpPainelOutput>("pdp_painel", ARGS);
	const dados = painel.data;

	useEffect(() => {
		if (!dados) return;
		const r = dados.resumo;
		app
			?.updateModelContext({
				content: [
					{
						type: "text",
						text: `Painel de deploy de PDP aberto: ${r.total} produtos no Gerador, ${r.validados} validados pelo Estilo, ${r.naWake} na Wake, ${r.prontos} prontos para enviar, ${r.publicados} publicados.`,
					},
				],
			})
			.catch(() => {});
	}, [app, dados]);

	const lista = useMemo(() => {
		const b = busca.toLowerCase().trim();
		return (dados?.produtos ?? [])
			.filter(
				(a) =>
					filtro === "todos" ||
					(filtro === "na_wake" && a.status !== "fora_da_wake") ||
					(filtro === "validados" && a.estilo.validado) ||
					(filtro === "prontos" && a.status === "pronto"),
			)
			.filter(
				(a) =>
					!b || `${a.ref} ${a.nome} ${a.familia}`.toLowerCase().includes(b),
			);
	}, [dados, filtro, busca]);

	if (painel.cancelado)
		return <p className="p-4 text-sm text-muted-foreground">Cancelado.</p>;
	if (!dados) {
		const erro = painel.erroHost ?? painel.error?.message;
		if (erro) return <Falha texto={erro} onTentar={() => painel.refetch()} />;
		return <Carregando texto="Lendo o Gerador e a Wake…" />;
	}

	const { resumo } = dados;
	return (
		<div className="space-y-4 p-4">
			<header className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-lg font-semibold">Deploy de PDP · Sprint</h1>
					<p className="text-sm text-muted-foreground">
						Gerador de PDP → Wake → site
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => painel.refetch()}
					disabled={painel.isFetching}
				>
					<RefreshCw
						className={painel.isFetching ? "animate-spin" : undefined}
					/>
					Atualizar
				</Button>
			</header>

			{painel.error ? <Falha texto={painel.error.message} /> : null}

			<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
				<Numero valor={resumo.total} label="No Gerador" />
				<Numero valor={resumo.validados} label="Validados pelo Estilo" />
				<Numero valor={resumo.naWake} label="Cadastrados na Wake" />
				<Numero valor={resumo.validadosNaWake} label="Validados e na Wake" />
				<Numero valor={resumo.publicados} label="Publicados" />
			</div>

			{resumo.validadosNaWake === 0 ? (
				<p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
					Nenhum produto validado pelo Estilo está cadastrado na Wake ainda.
					Para subir, o produto precisa das duas coisas.
				</p>
			) : null}

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
					<TabsList>
						{FILTROS.map((f) => (
							<TabsTrigger key={f.id} value={f.id}>
								{f.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
				<div className="relative sm:w-64">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={busca}
						onChange={(e) => setBusca(e.target.value)}
						placeholder="Nome, família ou referência"
						className="pl-8"
					/>
				</div>
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Produto</TableHead>
						<TableHead>Estilo</TableHead>
						<TableHead>Wake</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Blocos</TableHead>
						<TableHead />
					</TableRow>
				</TableHeader>
				<TableBody>
					{lista.map((a) => (
						<TableRow
							key={a.ref}
							className="cursor-pointer"
							onClick={() =>
								navigate({ to: "/produto/$ref", params: { ref: a.ref } })
							}
						>
							<TableCell>
								<div className="font-medium">{a.nome}</div>
								<div className="text-xs text-muted-foreground">
									{a.ref}
									{a.familia ? ` · ${a.familia}` : ""}
								</div>
							</TableCell>
							<TableCell className="text-xs">
								{a.estilo.validado ? "Validado" : "Em revisão"}
							</TableCell>
							<TableCell className="text-xs">
								{a.produtosWake.length
									? `${a.produtosWake.length} ${a.produtosWake.length > 1 ? "cores" : "cor"}`
									: "—"}
							</TableCell>
							<TableCell>
								<StatusBadge status={a.status} />
							</TableCell>
							<TableCell
								className="text-right text-xs tabular-nums"
								title="prontos / bloqueados"
							>
								{a.blocosProntos}
								{a.blocosBloqueados ? (
									<span className="text-destructive">
										{" "}
										/ {a.blocosBloqueados}
									</span>
								) : null}
							</TableCell>
							<TableCell className="w-6">
								<ChevronRight className="size-4 text-muted-foreground" />
							</TableCell>
						</TableRow>
					))}
					{!lista.length ? (
						<TableRow>
							<TableCell
								colSpan={6}
								className="py-8 text-center text-sm text-muted-foreground"
							>
								Nenhum produto neste recorte.
							</TableCell>
						</TableRow>
					) : null}
				</TableBody>
			</Table>
		</div>
	);
}
