import type { App } from "@modelcontextprotocol/ext-apps/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useMcpApp, useMcpState } from "@/context.tsx";

type Args = Record<string, unknown>;

export async function chamarTool<T>(
	app: App | null,
	name: string,
	args: Args,
): Promise<T> {
	if (!app) throw new Error("Sem conexão com o host.");
	const r = await app.callServerTool({ name, arguments: args });
	if (r.isError) {
		const t = r.content?.find((c) => c.type === "text");
		throw new Error(t?.type === "text" ? t.text : "Erro na ferramenta");
	}
	return r.structuredContent as T;
}

// `_route` é do Studio (rota da UI), não da tool.
const semRota = (a: Args | undefined) =>
	Object.entries(a ?? {}).filter(([k, v]) => k !== "_route" && v != null);

const mesmosArgs = (a: Args | undefined, b: Args) =>
	JSON.stringify(semRota(a).sort()) === JSON.stringify(semRota(b).sort());

/**
 * Dados de uma tool para a UI. Quando o host (chat ou app view do Studio)
 * chamou esta mesma tool com os mesmos argumentos, usa o resultado dele;
 * senão (preview, navegação dentro do app) chama a tool pelo `callServerTool`.
 */
export function useTool<T>(name: string, args: Args) {
	const app = useMcpApp();
	const state = useMcpState<Args, T>();
	const queryClient = useQueryClient();
	const queryKey = [name, args];
	const doHost = state.toolName === name && mesmosArgs(state.toolInput, args);
	const hostResult =
		doHost && state.status === "tool-result" ? state.toolResult : undefined;

	useEffect(() => {
		if (hostResult !== undefined)
			queryClient.setQueryData([name, args], hostResult);
	}, [hostResult, queryClient, name, args]);

	const query = useQuery({
		queryKey,
		queryFn: () => chamarTool<T>(app, name, args),
		enabled:
			!!app &&
			!(doHost && (state.status === "tool-input" || state.status === "error")),
		initialData: hostResult,
		staleTime: 60_000,
	});

	return {
		...query,
		erroHost: doHost && state.status === "error" ? state.error : undefined,
		cancelado: doHost && state.status === "tool-cancelled",
		aguardandoHost: doHost && state.status === "tool-input",
	};
}

export function useToolMutation<T, A extends Args>(
	name: string,
	onSuccess?: (data: T) => void,
) {
	const app = useMcpApp();
	return useMutation({
		mutationFn: (args: A) => chamarTool<T>(app, name, args),
		onSuccess,
	});
}
