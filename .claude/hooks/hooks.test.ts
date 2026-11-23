import { expect, test } from "bun:test";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { mergeTarget, skillsForFile, skillsForPrompt } from "./rules.ts";

const ROOT = resolve(import.meta.dir, "../..");
const HOOK = join(import.meta.dir, "hook.ts");

/** Runs hook.ts with `input` on stdin, as Claude Code does; returns its stdout. */
function run(input: unknown, env: Record<string, string> = {}) {
	const r = Bun.spawnSync(["bun", HOOK], {
		stdin: Buffer.from(
			typeof input === "string" ? input : JSON.stringify(input),
		),
		env: { ...process.env, ...env },
	});
	expect(r.exitCode).toBe(0);
	return r.stdout.toString();
}

const session = () => `test-${crypto.randomUUID()}`;
const edit = (s: string, file: string) =>
	run({
		session_id: s,
		cwd: ROOT,
		hook_event_name: "PreToolUse",
		tool_name: "Edit",
		tool_input: { file_path: file },
	});
const loadSkill = (s: string, skill: string) =>
	run({
		session_id: s,
		hook_event_name: "PostToolUse",
		tool_name: "Skill",
		tool_input: { skill },
	});

test("a UI file needs the UI skills; a screen also needs screens-and-tools; a tool needs add-tool", () => {
	expect(skillsForFile("web/components/ui/button.tsx")).toEqual([
		"ui-components",
		"studio-ui",
	]);
	expect(skillsForFile("web/router.tsx")).toEqual([
		"ui-components",
		"studio-ui",
		"screens-and-tools",
	]);
	expect(skillsForFile("web/tools/hello/index.tsx")).toContain(
		"screens-and-tools",
	);
	expect(skillsForFile("api/tools/hello.ts")).toEqual(["add-tool"]);
	expect(skillsForFile("api/resources/hello.ts")).toEqual(["add-tool"]);
});

test("files no skill covers aren't gated", () => {
	for (const f of [
		"api/app.ts",
		"api/main.bun.ts",
		"README.md",
		".claude/hooks/rules.ts",
	])
		expect(skillsForFile(f)).toEqual([]);
});

test("an edit of a UI file is refused until its skills are loaded, then goes through", () => {
	const s = session();
	const file = join(ROOT, "web/app.tsx");
	const out = JSON.parse(edit(s, file));
	expect(out.hookSpecificOutput.permissionDecision).toBe("deny");
	expect(out.hookSpecificOutput.permissionDecisionReason).toContain(
		"ui-components, studio-ui",
	);
	loadSkill(s, "ui-components");
	expect(edit(s, file)).toContain("studio-ui");
	run({
		session_id: s,
		hook_event_name: "PostToolUse",
		tool_name: "Read",
		tool_input: { file_path: join(ROOT, ".claude/skills/studio-ui/SKILL.md") },
	});
	expect(edit(s, file)).toBe("");
});

test("a relative path is resolved from cwd, and an ungated file passes", () => {
	const s = session();
	expect(edit(s, "web/lib/utils.ts")).toContain("deny");
	expect(edit(s, join(ROOT, "api/app.ts"))).toBe("");
	expect(edit(s, "/etc/hosts")).toBe("");
});

test("another plugin's skill of the same name doesn't count", () => {
	const s = session();
	loadSkill(s, "other-plugin:ui-components");
	loadSkill(s, "studio-ui");
	expect(edit(s, join(ROOT, "web/app.tsx"))).toContain("ui-components");
});

test("the request's words suggest skills, Portuguese or English, minus the ones loaded", () => {
	expect(skillsForPrompt("ajusta a tela de resultados")).toEqual([
		"ui-components",
		"studio-ui",
	]);
	expect(skillsForPrompt("add an animation to the save button")).toEqual([
		"saving",
		"motion",
	]);
	expect(skillsForPrompt("publica na store")).toEqual(["publish-store"]);
	expect(skillsForPrompt("why is the build slow")).toEqual([]);
	const s = session();
	loadSkill(s, "ui-components");
	const out = run({
		session_id: s,
		hook_event_name: "UserPromptSubmit",
		prompt: "muda o layout da tela",
	});
	expect(out).toContain("studio-ui");
	expect(out).not.toContain("ui-components");
});

test("only a real gh pr merge is a merge", () => {
	expect(mergeTarget("gh pr merge 12 --squash")).toBe("12");
	expect(
		mergeTarget(
			"gh pr checks 12 --watch && gh pr merge --squash --delete-branch",
		),
	).toBe("");
	expect(mergeTarget('git commit -m "then gh pr merge 12"')).toBeNull();
	expect(mergeTarget("gh pr view 12")).toBeNull();
});

/** Runs a merge with a fake `gh` whose `pr checks` prints `out` (to stderr with `err`). */
function merge(out: string, err = false) {
	const bin = mkdtempSync(join(tmpdir(), "fake-gh-"));
	writeFileSync(
		join(bin, "gh"),
		`#!/bin/sh\ncat <<'X' ${err ? ">&2" : ""}\n${out}\nX\n`,
	);
	chmodSync(join(bin, "gh"), 0o755);
	return run(
		{
			session_id: session(),
			cwd: ROOT,
			hook_event_name: "PreToolUse",
			tool_name: "Bash",
			tool_input: { command: "gh pr merge 7 --squash" },
		},
		{ PATH: `${bin}:${process.env.PATH}` },
	);
}

test("gh pr merge waits for red or running checks, and lets green, skipped or check-less PRs through", () => {
	const checks = (...b: string[]) =>
		JSON.stringify(b.map((bucket, i) => ({ name: `c${i}`, bucket })));
	expect(merge(checks("pass", "fail"))).toContain("CI failed");
	expect(merge(checks("pass", "cancel"))).toContain("CI failed");
	expect(merge(checks("pass", "pending"))).toContain("still running");
	expect(merge(checks("pass", "skipping", "neutral"))).toBe("");
	expect(merge("no checks reported on the 'x' branch", true)).toBe("");
	expect(merge("HTTP 401", true)).toContain("Couldn't read");
});

test("a hook that breaks lets the call through", () => {
	expect(run("not json")).toBe("");
	// No session: nothing to check against.
	expect(
		run({
			hook_event_name: "PreToolUse",
			tool_name: "Edit",
			tool_input: { file_path: join(ROOT, "web/app.tsx") },
		}),
	).toBe("");
});
