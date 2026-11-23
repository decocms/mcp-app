import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "./components/ui/sonner.tsx";
import { McpProvider } from "./context.tsx";
import { AppRouter } from "./router.tsx";
import "./globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Missing root element");
}

// Reads through web/lib/tools.ts. One retry: a failing block should say so soon.
const queryClient = new QueryClient({
	defaultOptions: { queries: { retry: 1 } },
});

const root = createRoot(rootElement);
root.render(
	<StrictMode>
		<McpProvider>
			<QueryClientProvider client={queryClient}>
				<AppRouter />
				<Toaster />
			</QueryClientProvider>
		</McpProvider>
	</StrictMode>,
);
