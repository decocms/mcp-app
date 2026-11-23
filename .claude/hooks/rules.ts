/**
 * The hooks' rules, pure (hooks.test.ts tests them). hook.ts does the I/O.
 *
 * Ideas from decocms/channels (and ops-control-plane before it): an edit waits
 * for the skills that cover its file, a request gets the skills its words call
 * for, and `gh pr merge` waits for green CI (so a red PR can't be merged when
 * the repo has no branch protection).
 */

/** Which skills must be loaded before editing a file (repo-relative globs). */
export const EDIT_RULES: { paths: string[]; skills: string[] }[] = [
	{ paths: ["web/**"], skills: ["ui-components", "studio-ui"] },
	{
		paths: ["web/router.tsx", "web/context.tsx", "web/tools/**"],
		skills: ["screens-and-tools"],
	},
	{ paths: ["api/tools/**", "api/resources/**"], skills: ["add-tool"] },
];

/** Skills a request suggests, by its words (Portuguese and English). */
export const PROMPT_RULES: { words: RegExp; skills: string[] }[] = [
	{
		words:
			/\b(tela|telas|screen|ui|componente|component|layout|visual|design|p[aá]gina|card|modal|css|tailwind)\b/i,
		skills: ["ui-components", "studio-ui"],
	},
	{
		words:
			/\b(aba|tab|view|route|rota|drill|navega[cç][aã]o|navigation|useMcpState|callServerTool)\b/i,
		skills: ["screens-and-tools"],
	},
	{
		words:
			/\b(salvar|salva|save|form|formul[aá]rio|toggle|checkbox|campo|bot[aã]o|button)\b/i,
		skills: ["saving"],
	},
	{
		words:
			/\b(anima[cç][aã]o|animate|animation|transi[cç][aã]o|transition|motion|hover)\b/i,
		skills: ["motion"],
	},
	{
		words: /\b(qa|abrir (o )?pr|open (a )?pr|pull request)\b/i,
		skills: ["qa"],
	},
	{
		words: /\b(tool|tools|ferramenta|ferramentas|resource)\b/i,
		skills: ["add-tool"],
	},
	{
		words: /\b(deploy|cloudflare|workers?|deno|lambda|node\.?js|entrypoint)\b/i,
		skills: ["add-deploy-target"],
	},
	{
		words: /\b(publicar|publish|store|loja|registry)\b/i,
		skills: ["publish-store"],
	},
	{
		words: /\b(template|upstream)\b/i,
		skills: ["migrate-template"],
	},
];

const unique = (xs: string[]) => [...new Set(xs)];

/** The skills that must be loaded before editing `rel` (repo-relative). */
export const skillsForFile = (rel: string) =>
	unique(
		EDIT_RULES.filter((r) =>
			r.paths.some((p) => new Bun.Glob(p).match(rel)),
		).flatMap((r) => r.skills),
	);

/** The skills a request's words point at. */
export const skillsForPrompt = (prompt: string) =>
	unique(
		PROMPT_RULES.filter((r) => r.words.test(prompt)).flatMap((r) => r.skills),
	);

/**
 * The skill a tool call loads: the Skill tool (bare name or a path-scoped
 * `apps/x:name`, not another plugin's `plugin:name`), or reading a SKILL.md.
 */
export function skillLoadedBy(
	tool: string,
	input: Record<string, unknown>,
): string | null {
	if (tool === "Skill" && typeof input.skill === "string") {
		const [prefix, name] = input.skill.includes(":")
			? input.skill.split(":", 2)
			: ["", input.skill];
		return !prefix || prefix.includes("/") ? (name ?? null) : null;
	}
	if (tool === "Read" && typeof input.file_path === "string")
		return (
			input.file_path.match(/\.claude\/skills\/([^/]+)\/SKILL\.md$/)?.[1] ??
			null
		);
	return null;
}

/** The PR a command merges ("" = the current branch's), or null when it doesn't. */
export function mergeTarget(command: string): string | null {
	// Quoted text and heredoc bodies don't run (a commit message may say "gh pr merge").
	const run = command
		.replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\b/g, "")
		.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''");
	const m = run.match(/\bgh\s+pr\s+merge\b([^;&|\n]*)/);
	if (!m) return null;
	return (
		(m[1] ?? "")
			.trim()
			.split(/\s+/)
			.find((a) => a && !a.startsWith("-")) ?? ""
	);
}

/** gh's bucket per check: pass | fail | pending | skipping | cancel. */
export type Check = { name: string; bucket: string };

/** Why a merge must wait, or null once every check passed or was skipped. */
export function mergeBlock(checks: Check[]): string | null {
	const names = (b: string[]) =>
		checks.filter((c) => b.includes(c.bucket)).map((c) => c.name);
	const failed = names(["fail", "cancel"]);
	if (failed.length)
		return `CI failed on this PR (${failed.join(", ")}). Fix it, push, and merge once it's green.`;
	const pending = names(["pending"]);
	if (pending.length)
		return `CI is still running on this PR (${pending.join(", ")}). Wait with \`gh pr checks <n> --watch\`, then merge.`;
	return null;
}
