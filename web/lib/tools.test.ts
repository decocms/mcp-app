import { expect, test } from "bun:test";
import { unwrap } from "./tools.ts";

test("unwrap returns the structured output", () => {
	const out = unwrap<{ n: number }>({
		content: [],
		structuredContent: { n: 1 },
	});
	expect(out).toEqual({ n: 1 });
});

test("unwrap throws the tool's error text", () => {
	expect(() =>
		unwrap({ isError: true, content: [{ type: "text", text: "boom" }] }),
	).toThrow("boom");
	expect(() => unwrap({ isError: true, content: [] })).toThrow(
		"Tool returned an error",
	);
});
