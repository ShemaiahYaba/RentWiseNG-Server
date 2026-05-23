/**
 * Verify package.json uses exact versions aligned with pnpm-lock.yaml.
 *
 * CI (after frozen install):
 *   pnpm install --frozen-lockfile
 *   pnpm run deps:check
 */
import { join } from "node:path";
import {
  checkDepsAlignment,
  formatCheckIssues,
  readPackageManifest,
  readPinnedVersions,
  repoRoot,
} from "./lib/deps-lockfile.js";

const manifestPath = join(repoRoot, "package.json");
const lockfilePath = join(repoRoot, "pnpm-lock.yaml");

const manifest = readPackageManifest(manifestPath);
const pinned = readPinnedVersions(lockfilePath);
const issues = checkDepsAlignment(manifest, pinned);

if (issues.length > 0) {
  console.error(`deps:check failed (${issues.length} issue(s)):\n`);
  console.error(formatCheckIssues(issues));
  console.error("\nFix: pnpm run deps:pin");
  process.exit(1);
}

console.log("deps:check passed — all direct deps are exact and match the lockfile.");
