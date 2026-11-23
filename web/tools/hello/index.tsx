import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useMcpApp, useMcpState } from "@/context.tsx";
import { formatDateTime } from "@/lib/format.ts";
import type { HelloInput, HelloOutput } from "../../../api/tools/hello.ts";

/** The reference page: one frame drawn from the first paint, every McpStatus handled. */
export default function HelloPage() {
	const state = useMcpState<HelloInput, HelloOutput>();
	const app = useMcpApp();

	if (state.status === "error" || state.status === "tool-cancelled") {
		return (
			<div className="flex min-h-dvh items-center justify-center p-6">
				<Alert variant="destructive" className="max-w-md">
					<AlertTitle>
						{state.status === "error" ? "Couldn't greet" : "Cancelled"}
					</AlertTitle>
					<AlertDescription>
						{state.status === "error"
							? (state.error ?? "Unknown error")
							: "The tool call was cancelled."}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const result = state.status === "tool-result" ? state.toolResult : undefined;

	return (
		<div className="flex min-h-dvh items-center justify-center p-6">
			<Card className="w-full max-w-md text-center">
				<CardHeader>
					<CardTitle className="font-display text-2xl">
						{result ? (
							result.greeting
						) : state.status === "tool-input" ? (
							<Skeleton className="mx-auto h-8 w-3/4" />
						) : (
							"Hello MCP App"
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{result ? (
						<>
							<p className="text-meta">{formatDateTime(result.timestamp)}</p>
							<Button
								onClick={() => {
									const name = state.toolInput?.name ?? "there";
									app?.sendMessage({
										role: "user",
										content: [
											{
												type: "text",
												text: `Please greet ${name} warmly and tell them a little about yourself — who you are, what you can help with, and something interesting about how you work.`,
											},
										],
									});
								}}
							>
								Send Message
							</Button>
						</>
					) : state.status === "tool-input" ? (
						<Skeleton className="mx-auto h-4 w-1/3" />
					) : (
						<p className="text-muted-foreground">
							Call the <Badge variant="secondary">hello_world</Badge> tool to
							see a greeting here.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
