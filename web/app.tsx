import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { McpProvider } from "./context.tsx";
import { AppRouter } from "./router.tsx";
import "./globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Missing root element");
}

const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const root = createRoot(rootElement);
root.render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<McpProvider>
				<AppRouter />
			</McpProvider>
		</QueryClientProvider>
	</StrictMode>,
);
