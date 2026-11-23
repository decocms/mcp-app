import type { App } from "@modelcontextprotocol/ext-apps/react";
import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { useMcpApp } from "@/context.tsx";

type ToolResult = Awaited<ReturnType<App["callServerTool"]>>;
type Args = Record<string, unknown>;

/** The message a failed tool result carries. */
export function toolError(result: ToolResult): string {
	const text = result.content?.find((c) => c.type === "text");
	return (text?.type === "text" && text.text) || "Tool returned an error";
}

/** A tool result's structured output; throws the tool's error when it failed. */
export function unwrap<T>(result: ToolResult): T {
	if (result.isError) throw new Error(toolError(result));
	return result.structuredContent as T;
}

/**
 * Calls a tool of this app's server from a screen: resolves to its output,
 * throws its error. Use it for writes (`saving`) and inside `useToolQuery`.
 */
export function useCallTool() {
	const app = useMcpApp();
	return async <T>(name: string, args: Args = {}): Promise<T> => {
		if (!app) throw new Error("Not connected to the host yet");
		return unwrap<T>(await app.callServerTool({ name, arguments: args }));
	};
}

/**
 * Reads extra data on a screen (a panel, a block) through a tool, cached by
 * react-query under `[name, args]`. Re-reading the same data? Pass
 * `placeholderData: keepPreviousData` so the screen keeps the last answer.
 */
export function useToolQuery<T>(
	name: string,
	args: Args = {},
	options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
	const app = useMcpApp();
	const call = useCallTool();
	return useQuery({
		...options,
		queryKey: [name, args],
		queryFn: () => call<T>(name, args),
		enabled: !!app && options?.enabled !== false,
	});
}
