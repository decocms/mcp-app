import {
	creativeResizeStartTool,
	creativeResizeStatusTool,
} from "./creative-resize-generate.ts";
import { creativeResizeTool } from "./creative-resize.ts";
import { helloTool } from "./hello.ts";

export const tools = [
	helloTool,
	creativeResizeTool,
	creativeResizeStartTool,
	creativeResizeStatusTool,
];
