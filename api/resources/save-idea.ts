import { createPublicResource } from "@decocms/runtime/tools";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { store } from "../storage/index.ts";
import type { Env } from "../types/env.ts";

export const IDEA_STORE_KEY = "user-idea";

/**
 * Resource template that saves the user's idea via the MCP protocol.
 * The UI calls readServerResource({ uri: "data://mcp-app/save-idea/<encoded>" })
 * and the read handler extracts the idea from the URI and saves it to the store.
 *
 * This is a workaround: the side panel cannot use sendMessage, but CAN use
 * readServerResource — so we encode the data in the URI.
 */
export const saveIdeaResource = (_env: Env) =>
	createPublicResource({
		// Pass ResourceTemplate as uri — @decocms/runtime forwards it to
		// server.resource() which detects it's not a string and registers it
		// as a template with URI pattern matching.
		uri: new ResourceTemplate("data://mcp-app/save-idea/{idea}", {
			list: undefined,
		}) as unknown as string,
		name: "Save User Idea",
		description:
			"Saves the user's initial business idea for the Lean Canvas prompt",
		mimeType: "application/json",
		read: async ({ uri }) => {
			// uri is the full URL: data://mcp-app/save-idea/encoded-idea-text
			const uriStr = uri.toString();
			const marker = "/save-idea/";
			const idx = uriStr.indexOf(marker);
			if (idx !== -1) {
				const encoded = uriStr.slice(idx + marker.length);
				if (encoded) {
					const idea = decodeURIComponent(encoded);
					await store.set(IDEA_STORE_KEY, idea);
				}
			}

			const savedIdea = await store.get<string>(IDEA_STORE_KEY);
			return {
				uri: "data://mcp-app/save-idea",
				mimeType: "application/json",
				text: JSON.stringify({ idea: savedIdea ?? null }),
			};
		},
	});
