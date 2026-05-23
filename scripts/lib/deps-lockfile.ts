import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const RANGE_PATTERN = /[\^~>=*]/;

export type DepSection = "dependencies" | "devDependencies";

export type ManifestDeps = Record<DepSection, Record<string, string>>;

export type LockEntry = {
  specifier: string;
  version: string;
};

export type PinnedVersions = Map<string, string>;

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(scriptDir, "..", "..");

export function normalizeResolvedVersion(version: string): string {
  const paren = version.indexOf("(");
  return paren === -1 ? version : version.slice(0, paren);
}

export function hasRangeOperator(version: string): boolean {
  return RANGE_PATTERN.test(version.trim());
}

function parseLockSection(
  section: Record<string, LockEntry> | undefined,
  into: PinnedVersions,
): void {
  if (!section) return;
  for (const [name, entry] of Object.entries(section)) {
    into.set(name, normalizeResolvedVersion(entry.version));
  }
}

export function readPinnedVersions(lockfilePath: string): PinnedVersions {
  const raw = readFileSync(lockfilePath, "utf8");
  const doc = parseYaml(raw) as {
    importers?: Record<
      string,
      {
        dependencies?: Record<string, LockEntry>;
        devDependencies?: Record<string, LockEntry>;
      }
    >;
  };

  const importer = doc.importers?.["."];
  if (!importer) {
    throw new Error(`No importers["."] found in ${lockfilePath}`);
  }

  const pinned = new Map<string, string>();
  parseLockSection(importer.dependencies, pinned);
  parseLockSection(importer.devDependencies, pinned);
  return pinned;
}

export function readPackageManifest(manifestPath: string): {
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  return {
    version: pkg.version ?? "0.0.0",
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
  };
}

export function collectManifestDeps(manifest: {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}): Array<{ name: string; section: DepSection; specifier: string }> {
  const entries: Array<{ name: string; section: DepSection; specifier: string }> =
    [];
  for (const [name, specifier] of Object.entries(manifest.dependencies)) {
    entries.push({ name, section: "dependencies", specifier });
  }
  for (const [name, specifier] of Object.entries(manifest.devDependencies)) {
    entries.push({ name, section: "devDependencies", specifier });
  }
  return entries;
}

export type DepCheckIssue =
  | { kind: "range"; name: string; section: DepSection; specifier: string }
  | {
      kind: "drift";
      name: string;
      section: DepSection;
      manifest: string;
      lockfile: string;
    }
  | { kind: "missing_lock"; name: string; section: DepSection; manifest: string };

export function checkDepsAlignment(
  manifest: {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  },
  pinned: PinnedVersions,
): DepCheckIssue[] {
  const issues: DepCheckIssue[] = [];

  for (const { name, section, specifier } of collectManifestDeps(manifest)) {
    if (hasRangeOperator(specifier)) {
      issues.push({ kind: "range", name, section, specifier });
      continue;
    }

    const lockVersion = pinned.get(name);
    if (lockVersion === undefined) {
      issues.push({ kind: "missing_lock", name, section, manifest: specifier });
      continue;
    }

    if (specifier !== lockVersion) {
      issues.push({
        kind: "drift",
        name,
        section,
        manifest: specifier,
        lockfile: lockVersion,
      });
    }
  }

  return issues;
}

export function formatCheckIssues(issues: DepCheckIssue[]): string {
  return issues
    .map((issue) => {
      switch (issue.kind) {
        case "range":
          return `  [range] ${issue.section} "${issue.name}": ${issue.specifier} (use exact version; run pnpm run deps:pin)`;
        case "drift":
          return `  [drift] ${issue.section} "${issue.name}": package.json=${issue.manifest}, lockfile=${issue.lockfile}`;
        case "missing_lock":
          return `  [missing] ${issue.section} "${issue.name}": in package.json but not in pnpm-lock.yaml`;
      }
    })
    .join("\n");
}
