/**
 * Pin direct dependencies to exact versions from pnpm-lock.yaml.
 *
 * CI (after frozen install):
 *   pnpm install --frozen-lockfile
 *   pnpm run deps:check
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectManifestDeps,
  readPackageManifest,
  readPinnedVersions,
  repoRoot,
} from "./lib/deps-lockfile.js";

const dryRun = process.argv.includes("--dry-run");
const manifestPath = join(repoRoot, "package.json");
const lockfilePath = join(repoRoot, "pnpm-lock.yaml");

const pinned = readPinnedVersions(lockfilePath);
const manifest = readPackageManifest(manifestPath);
const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;

const changes: Array<{ name: string; from: string; to: string }> = [];

for (const { name, section, specifier } of collectManifestDeps(manifest)) {
  const exact = pinned.get(name);
  if (exact === undefined) {
    console.error(`error: "${name}" not found in pnpm-lock.yaml`);
    process.exit(1);
  }
  if (specifier !== exact) {
    changes.push({ name, from: specifier, to: exact });
    if (section === "dependencies") {
      (pkg.dependencies as Record<string, string>)[name] = exact;
    } else {
      (pkg.devDependencies as Record<string, string>)[name] = exact;
    }
  }
}

if (changes.length === 0) {
  console.log("All direct dependencies are already pinned.");
  process.exit(0);
}

console.log(`Pinning ${changes.length} package(s):\n`);
for (const { name, from, to } of changes) {
  console.log(`  ${name}: ${from} → ${to}`);
}

if (dryRun) {
  console.log("\n(dry-run: package.json and lockfile not modified)");
  process.exit(0);
}

writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
console.log("\nRunning pnpm install to sync lockfile specifiers…");
execSync("pnpm install", { cwd: repoRoot, stdio: "inherit" });
console.log("Done. Run `pnpm run deps:check` to verify.");
