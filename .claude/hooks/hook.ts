/**
 * Every Claude Code hook of this repo (wired in ../settings.json); what it
 * enforces is in rules.ts. Loaded skills are kept per session in a temp file;
 * subagents share their session's id, so what the main thread loaded before
 * briefing them counts for them too.
 *
 * Fails open: any error in here lets the tool call through, so a broken hook
 * never bricks the repo.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
	mergeBlock,
	mergeTarget,
	skillLoadedBy,
	skillsForFile,
	skillsForPrompt,
} from "./rules.ts";

type Input = {
	session_id?: string;
	cwd?: string;
	hook_event_name?: string;
	tool_name?: string;
	tool_input?: Record<string, unknown>;
	prompt?: string;
};

const skillsFile = (session: string) =>
	join(tmpdir(), `mcp-app-skills-${session.replace(/[^\w-]/g, "")}`);

const loaded = (session: string) => {
	try {
		return new Set(
			readFileSync(skillsFile(session), "utf8").split("\n").filter(Boolean),
		);
	} catch {
		return new Set<string>();
	}
};

const deny = (reason: string) =>
	console.log(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reason,
			},
		}),
	);

/** `file` relative to the checkout (this one or another worktree) it's in; null outside one. */
function repoPath(file: string, cwd: string): string | null {
	const abs = isAbsolute(file) ? file : resolve(cwd, file);
	for (let d = dirname(abs); dirname(d) !== d; d = dirname(d))
		if (
			existsSync(join(d, ".git")) &&
			existsSync(join(d, ".claude/hooks/rules.ts"))
		)
			return relative(d, abs);
	return null;
}

/** The checks of the PR `ref` ("" = current branch), [] when it has none, null when gh can't say. */
function checksOf(ref: string, command: string, cwd: string) {
	const env = { ...process.env };
	// `GH_TOKEN=$(gh auth token --user X) gh pr merge`: read the checks as X too.
	const user = command.match(/gh\s+auth\s+token\s+--user\s+([\w-]+)/)?.[1];
	if (user)
		env.GH_TOKEN = Bun.spawnSync(["gh", "auth", "token", "--user", user])
			.stdout.toString()
			.trim();
	const r = Bun.spawnSync(
		["gh", "pr", "checks", ...(ref ? [ref] : []), "--json", "name,bucket"],
		{ cwd, env },
	);
	const out = r.stdout.toString().trim();
	// A PR no workflow watches (e.g. only .claude changed) has no checks at all.
	if (/no checks reported/i.test(`${out}\n${r.stderr}`)) return [];
	try {
		return JSON.parse(out); // gh exits 8 while checks are pending, but still prints them
	} catch {
		return null;
	}
}

async function main() {
	const input = (await Bun.stdin.json()) as Input;
	const session = input.session_id;
	const tool = input.tool_name ?? "";
	const t = input.tool_input ?? {};
	const cwd = input.cwd ?? process.cwd();

	if (input.hook_event_name === "PostToolUse") {
		const skill = session && skillLoadedBy(tool, t);
		if (skill) appendFileSync(skillsFile(session), `${skill}\n`);
		return;
	}

	if (input.hook_event_name === "UserPromptSubmit") {
		const have = session ? loaded(session) : new Set();
		const need = skillsForPrompt(input.prompt ?? "").filter(
			(s) => !have.has(s),
		);
		if (need.length)
			console.log(
				`[mcp-app] This request touches what these skills cover; load them with the Skill tool before acting: ${need.join(", ")}.`,
			);
		return;
	}

	if (input.hook_event_name !== "PreToolUse") return;

	const file = t.file_path ?? t.notebook_path;
	if (typeof file === "string" && session) {
		const rel = repoPath(file, cwd);
		const have = loaded(session);
		const missing =
			rel === null ? [] : skillsForFile(rel).filter((s) => !have.has(s));
		if (missing.length)
			deny(
				`Before editing ${rel}, load with the Skill tool: ${missing.join(", ")}. They say how this part of the repo is built. Then retry the edit.`,
			);
		return;
	}

	if (tool === "Bash" && typeof t.command === "string") {
		const ref = mergeTarget(t.command);
		if (ref === null) return;
		const checks = checksOf(ref, t.command, cwd);
		const reason =
			checks === null
				? "Couldn't read this PR's checks. Run `gh pr checks <n>` and merge only when they're green."
				: mergeBlock(checks);
		if (reason) deny(reason);
	}
}

try {
	await main();
} catch (e) {
	console.error(`[mcp-app hook] ${e}`); // fail open
}
process.exit(0);
