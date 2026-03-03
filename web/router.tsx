import { createHashHistory } from "@tanstack/history";
import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import ToolPage from "@tool/index.tsx";
import { useMcpHostContext } from "./context.tsx";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: ToolPage,
});

const routeTree = rootRoute.addChildren([indexRoute]);

const router = createRouter({
	routeTree,
	history: createHashHistory(),
});

export function AppRouter() {
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
