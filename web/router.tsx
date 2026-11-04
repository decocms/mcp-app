import { createMemoryHistory } from "@tanstack/history";
import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
	useParams,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useMcpApp, useMcpHostContext, useMcpState } from "./context.tsx";
import PdpDetalhePage from "./tools/pdp-detalhe/index.tsx";
import PdpPainelPage from "./tools/pdp-painel/index.tsx";

// pdp_detalhe sem referência (o Studio abre cada UI como app, sem argumentos)
// mostra o painel.
function PdpDetalheDoHost() {
	const { toolInput } = useMcpState<{ referencia?: string }>();
	return toolInput?.referencia ? (
		<PdpDetalhePage referencia={toolInput.referencia} />
	) : (
		<PdpPainelPage />
	);
}

const TOOL_PAGES: Record<string, React.ComponentType> = {
	pdp_painel: PdpPainelPage,
	pdp_detalhe: PdpDetalheDoHost,
};

function ToolRouter() {
	const { toolName } = useMcpState();

	if (!toolName) {
		return (
			<div className="flex items-center justify-center min-h-dvh p-6">
				<div className="flex items-center gap-3 text-muted-foreground">
					<span className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
					<span className="text-sm">Connecting to host...</span>
				</div>
			</div>
		);
	}

	const Page = TOOL_PAGES[toolName];

	if (!Page) {
		return (
			<div className="flex items-center justify-center min-h-dvh p-6">
				<p className="text-sm text-destructive">Unknown tool: {toolName}</p>
			</div>
		);
	}

	return <Page />;
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: ToolRouter,
});

// Navegação dentro do app: no Studio a rota vira o arg `_route` da view e
// sobrevive a um reload.
const painelRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/painel",
	component: PdpPainelPage,
});

const produtoRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/produto/$ref",
	component: function ProdutoRoute() {
		const { ref } = useParams({ from: "/produto/$ref" });
		return <PdpDetalhePage key={ref} referencia={ref} />;
	},
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	painelRoute,
	produtoRoute,
]);

const history = createMemoryHistory();
const router = createRouter({ routeTree, history });

export function AppRouter() {
	const app = useMcpApp();
	const { toolInput } = useMcpState<{ _route?: string }>();
	const route = toolInput?._route;

	useEffect(() => {
		if (route) history.replace(route);
	}, [route]);

	useEffect(() => {
		if (app?.getHostVersion()?.name !== "Studio") return;
		return router.subscribe("onResolved", ({ fromLocation, toLocation }) => {
			if (!fromLocation) return;
			const args = encodeURIComponent(
				JSON.stringify({ _route: toLocation.href }),
			);
			app.sendMessage({
				role: "user",
				content: [
					{
						type: "resource_link",
						name: "navigate",
						uri: `studio://navigate?args=${args}`,
					},
				],
			});
		});
	}, [app]);

	return <RouterProvider router={router} />;
}

function RootLayout() {
	const hostContext = useMcpHostContext();
	const insets = hostContext?.safeAreaInsets;

	return (
		<div
			style={
				insets
					? {
							paddingTop: `${insets.top}px`,
							paddingRight: `${insets.right}px`,
							paddingBottom: `${insets.bottom}px`,
							paddingLeft: `${insets.left}px`,
						}
					: undefined
			}
		>
			<Outlet />
		</div>
	);
}
