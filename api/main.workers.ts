// dist/client/index.html is injected as a Text module via wrangler.toml [[rules]]
import CLIENT_HTML from "../dist/client/index.html";
import { createApp } from "./app.ts";

const html = CLIENT_HTML as unknown as string;

export default createApp(() => Promise.resolve(html));
