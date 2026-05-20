import { describe, expect, it } from "bun:test";
import { buildPrompt, mapToAspectRatio } from "./creative-resize.ts";

describe("mapToAspectRatio", () => {
	it("maps square formats to 1024x1024", () => {
		expect(mapToAspectRatio(1080, 1080)).toBe("1024x1024");
	});

	it("maps landscape formats to 1536x1024", () => {
		expect(mapToAspectRatio(1200, 628)).toBe("1536x1024");
		expect(mapToAspectRatio(1600, 900)).toBe("1536x1024");
	});

	it("maps portrait formats to 1024x1536", () => {
		expect(mapToAspectRatio(1080, 1920)).toBe("1024x1536");
		expect(mapToAspectRatio(1000, 1500)).toBe("1024x1536");
	});
});

describe("buildPrompt", () => {
	it("includes format name and dimensions", () => {
		const prompt = buildPrompt({
			name: "Instagram Story",
			width: 1080,
			height: 1920,
			promptHint: "vertical 9:16 story",
		});
		expect(prompt).toContain("Instagram Story");
		expect(prompt).toContain("1080×1920");
		expect(prompt).toContain("vertical 9:16 story");
	});
});
