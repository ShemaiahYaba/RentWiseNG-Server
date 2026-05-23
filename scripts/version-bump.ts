/**
 * Interactive semver bump from git history (conventional-commit heuristics).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, input, select } from "@inquirer/prompts";
import semver from "semver";
import { readPackageManifest, repoRoot } from "./lib/deps-lockfile.js";

type BumpKind = "major" | "minor" | "patch" | "none";

type ClassifiedCommit = {
  hash: string;
  subject: string;
  bump: BumpKind;
};

const manifestPath = join(repoRoot, "package.json");

function git(args: string): string {
  return execSync(`git ${args}`, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function gitTry(args: string): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function isWorkingTreeClean(): boolean {
  return git("status --porcelain") === "";
}

function listVersionTags(): string[] {
  const out = gitTry('tag -l "v*"') ?? "";
  if (!out) return [];
  return out
    .split("\n")
    .filter(Boolean)
    .filter((t) => semver.valid(semver.coerce(t)));
}

function latestVersionTag(): string | null {
  const tags = listVersionTags();
  if (tags.length === 0) return null;
  tags.sort((a, b) => {
    const va = semver.coerce(a);
    const vb = semver.coerce(b);
    if (!va || !vb) return 0;
    return semver.compare(vb, va);
  });
  return tags[0] ?? null;
}

function classifyCommit(subject: string, body: string): BumpKind {
  const text = `${subject}\n${body}`;
  if (/BREAKING CHANGE/i.test(text) || /^.+\!:/.test(subject) || /BREAKING/i.test(subject)) {
    return "major";
  }
  if (/^feat(\(.+\))?:/.test(subject)) {
    return "minor";
  }
  if (/^(fix|perf|refactor|revert)(\(.+\))?:/.test(subject)) {
    return "patch";
  }
  return "none";
}

function collectCommits(sinceRef: string | null): ClassifiedCommit[] {
  const range = sinceRef ? `${sinceRef}..HEAD` : "HEAD";
  const format = "%H|%s|%b<END>";
  const raw = git(`log ${range} --pretty=format:${format}`);
  if (!raw) return [];

  const blocks = raw.split("<END>").filter((b) => b.trim());
  const commits: ClassifiedCommit[] = [];

  for (const block of blocks) {
    const pipe = block.indexOf("|");
    const pipe2 = block.indexOf("|", pipe + 1);
    if (pipe === -1 || pipe2 === -1) continue;
    const hash = block.slice(0, pipe);
    const subject = block.slice(pipe + 1, pipe2).trim();
    const body = block.slice(pipe2 + 1).trim();
    commits.push({
      hash: hash.slice(0, 7),
      subject,
      bump: classifyCommit(subject, body),
    });
  }

  return commits;
}

function suggestBump(commits: ClassifiedCommit[]): BumpKind {
  if (commits.some((c) => c.bump === "major")) return "major";
  if (commits.some((c) => c.bump === "minor")) return "minor";
  if (commits.some((c) => c.bump === "patch")) return "patch";
  return "none";
}

function bumpLabel(kind: BumpKind): string {
  switch (kind) {
    case "major":
      return "major (breaking)";
    case "minor":
      return "minor (features)";
    case "patch":
      return "patch (fixes)";
    case "none":
      return "none (no conventional bumps)";
  }
}

async function main(): Promise<void> {
  const manifest = readPackageManifest(manifestPath);
  const current = manifest.version;

  if (!semver.valid(current)) {
    console.error(`error: invalid package.json version "${current}"`);
    process.exit(1);
  }

  const latestTag = latestVersionTag();
  const sinceRef = latestTag;
  const commits = collectCommits(sinceRef);

  console.log(`\nCurrent version: ${current}`);
  if (latestTag) {
    console.log(`Commits since ${latestTag}: ${commits.length}`);
  } else {
    console.log(`No v* tags found — analyzing all commits (${commits.length})`);
  }

  if (commits.length > 0) {
    console.log("\nCommit analysis:");
    for (const c of commits.slice(0, 30)) {
      const tag = c.bump === "none" ? "    " : `[${c.bump}]`;
      console.log(`  ${c.hash} ${tag} ${c.subject}`);
    }
    if (commits.length > 30) {
      console.log(`  … and ${commits.length - 30} more`);
    }
  }

  const suggested = suggestBump(commits);
  console.log(`\nSuggested bump: ${bumpLabel(suggested)}`);

  const bumpChoice = await select({
    message: "Version bump",
    choices: [
      { name: `Suggested — ${bumpLabel(suggested)}`, value: "suggested" as const },
      { name: "Major", value: "major" as const },
      { name: "Minor", value: "minor" as const },
      { name: "Patch", value: "patch" as const },
      { name: "Custom version", value: "custom" as const },
      { name: "Cancel", value: "cancel" as const },
    ],
  });

  if (bumpChoice === "cancel") {
    console.log("Cancelled.");
    process.exit(0);
  }

  let nextVersion: string | null = null;

  if (bumpChoice === "custom") {
    const custom = await input({
      message: "Enter version",
      default: current,
      validate: (v) => (semver.valid(v) ? true : "Invalid semver"),
    });
    nextVersion = custom;
  } else {
    const kind = bumpChoice === "suggested" ? suggested : bumpChoice;
    if (kind === "none") {
      const proceed = await confirm({
        message: "No conventional bumps detected. Bump patch anyway?",
        default: false,
      });
      if (!proceed) {
        console.log("Cancelled.");
        process.exit(0);
      }
      nextVersion = semver.inc(current, "patch");
    } else {
      nextVersion = semver.inc(current, kind);
    }
  }

  if (!nextVersion || !semver.valid(nextVersion)) {
    console.error("error: could not compute next version");
    process.exit(1);
  }

  if (semver.lte(nextVersion, current)) {
    const ok = await confirm({
      message: `New version ${nextVersion} is not greater than ${current}. Continue?`,
      default: false,
    });
    if (!ok) {
      console.log("Cancelled.");
      process.exit(0);
    }
  }

  console.log(`\n${current} → ${nextVersion}`);

  const writeOk = await confirm({
    message: "Update package.json?",
    default: true,
  });
  if (!writeOk) {
    console.log("Cancelled.");
    process.exit(0);
  }

  const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  pkg.version = nextVersion;
  writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  console.log(`Updated ${manifestPath}`);

  const wantGit = await confirm({
    message: "Create git commit and annotated tag?",
    default: false,
  });

  if (!wantGit) {
    console.log("\nNext: commit when ready, then `git tag v" + nextVersion + "`");
    return;
  }

  if (!isWorkingTreeClean()) {
    const dirtyOk = await confirm({
      message: "Working tree is not clean. Continue with commit/tag anyway?",
      default: false,
    });
    if (!dirtyOk) {
      console.log("Skipped git commit/tag. package.json was updated.");
      return;
    }
  }

  const tagName = `v${nextVersion}`;
  git(`add "${manifestPath}"`);
  git(`commit -m "chore(release): ${tagName}"`);
  git(`tag -a "${tagName}" -m "Release ${tagName}"`);
  console.log(`\nCreated commit and tag ${tagName}`);
  console.log("Next: git push && git push --tags");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
