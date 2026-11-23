/**
 * Vendor `@decocms/ui` into a project until it is published to npm.
 *
 *   bun run sync-ds.ts                      # → ./src/ds, every component
 *   bun run sync-ds.ts --dest web/ds        # custom destination
 *   bun run sync-ds.ts --only button,badge  # a component and its dependencies
 *
 * Also runs under `npx tsx`. Then alias the package to the destination:
 *
 *   vite.config.ts   resolve.alias: { "@decocms/ui": path.resolve(__dirname, "web/ds") }
 *   tsconfig.json    paths: { "@decocms/ui/*": ["./web/ds/*"] }
 *
 * and import `@decocms/ui/components/<name>.tsx`. That specifier is a real
 * subpath of the package's `exports`, so once it ships to npm, deleting the
 * alias is the whole migration.
 *
 * The destination is replaced on every run — never hand-edit it.
 */
import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, normalize, resolve } from "node:path";

const REPO = "https://github.com/decocms/studio.git";
const PKG_DIR = "packages/ui";

/**
 * Left out by default: `calendar` and everything on it target react-day-picker
 * v8, which clashes with the v9 most apps carry. Pass them to `--only` if you
 * need them and are on v8.
 */
const EXCLUDE = new Set([
	"calendar.tsx",
	"datetime-input.tsx",
	"time-range-picker.tsx",
]);

function flag(name: string): string | undefined {
	const index = process.argv.indexOf(`--${name}`);
	return index === -1 ? undefined : process.argv[index + 1];
}

function run(cmd: string, args: string[], cwd?: string) {
	const result = spawnSync(cmd, args, { cwd, stdio: "inherit" });
	if (result.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed`);
}

const dest = resolve(process.cwd(), flag("dest") ?? "src/ds");
const only = flag("only")
	?.split(",")
	.map((name) => name.trim())
	.filter(Boolean);

const work = mkdtempSync(join(tmpdir(), "decocms-ui-"));
try {
	run("git", [
		"clone",
		"--depth",
		"1",
		"--filter=blob:none",
		"--sparse",
		REPO,
		work,
	]);
	run("git", ["sparse-checkout", "set", PKG_DIR], work);

	const src = join(work, PKG_DIR, "src");
	const { version } = JSON.parse(
		readFileSync(join(work, PKG_DIR, "package.json"), "utf8"),
	) as { version: string };

	const seeds = (
		only ??
		readdirSync(join(src, "components"))
			.filter((file) => file.endsWith(".tsx") && !file.includes(".stories."))
			.filter((file) => !EXCLUDE.has(file))
			.map((file) => file.replace(/\.tsx$/, ""))
	).map((name) => `components/${name}.tsx`);

	// Follow relative imports so a seed brings its dependencies along.
	const seen = new Set<string>();
	const queue = [...seeds];
	while (queue.length > 0) {
		const rel = queue.shift();
		if (!rel || seen.has(rel)) continue;
		if (!existsSync(join(src, rel))) {
			console.warn(`  ! missing ${rel}`);
			continue;
		}
		seen.add(rel);
		const code = readFileSync(join(src, rel), "utf8");
		for (const match of code.matchAll(/from\s+"(\.[^"]+)"/g)) {
			const spec = /\.(tsx?|css)$/.test(match[1])
				? match[1]
				: `${match[1]}.tsx`;
			queue.push(normalize(join(dirname(rel), spec)));
		}
	}

	rmSync(dest, { recursive: true, force: true });

	for (const rel of [...seen].sort()) {
		const out = join(dest, rel);
		mkdirSync(dirname(out), { recursive: true });
		// The package writes a few relative imports without an extension;
		// normalise them so projects enforcing extensions still resolve.
		const code = readFileSync(join(src, rel), "utf8").replace(
			/from\s+"(\.[^"]+)"/g,
			(whole, spec: string) =>
				/\.(tsx?|css)$/.test(spec) ? whole : `from "${spec}.tsx"`,
		);
		writeFileSync(out, code);
	}

	mkdirSync(join(dest, "styles"), { recursive: true });
	const css = readFileSync(join(src, "styles/global.css"), "utf8");
	// `--keep-fonts` keeps the @font-face block (Switzer, Inter and Commit Mono,
	// ~860KB of woff2); by default it is dropped because single-file bundles
	// inline every font they reference.
	writeFileSync(
		join(dest, "styles/global.css"),
		process.argv.includes("--keep-fonts")
			? css
			: css.replace(/@font-face\s*\{[^}]*\}\s*/g, ""),
	);
	if (process.argv.includes("--keep-fonts")) {
		run("cp", ["-R", join(src, "assets"), join(dest, "assets")]);
	}

	copyFileSync(join(work, PKG_DIR, "LICENSE.md"), join(dest, "LICENSE.md"));
	writeFileSync(
		join(dest, "VERSION"),
		`@decocms/ui@${version}\nvendored by sync-ds.ts — do not edit by hand\n`,
	);

	// Derive the dependency list from what was actually copied, so it can't drift
	// from the component set: every bare import, collapsed to its package name.
	const packages = new Set<string>(["tw-animate-css", "shadcn"]); // CSS imports
	for (const rel of seen) {
		const code = readFileSync(join(src, rel), "utf8");
		for (const match of code.matchAll(/from\s+"([^".][^"]*)"/g)) {
			const parts = match[1].split("/");
			const name = match[1].startsWith("@")
				? parts.slice(0, 2).join("/")
				: parts[0];
			if (name !== "react" && name !== "react-dom") packages.add(name);
		}
	}

	console.log(
		`\nvendored @decocms/ui@${version} — ${seen.size} files → ${dest}`,
	);
	console.log(
		`\ninstall its dependencies:\n  bun add ${[...packages].sort().join(" ")}`,
	);
} finally {
	rmSync(work, { recursive: true, force: true });
}
