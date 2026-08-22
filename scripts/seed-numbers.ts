#!/usr/bin/env tsx
/**
 * Deterministic, idempotent, self-reporting number-pool importer (B056).
 * Reads data/seed/numbers.source.txt, normalises and validates every
 * entry via src/domain/phone.ts, and reports exactly what happened —
 * nothing is silently discarded or repaired (ADR-008).
 *
 * Usage:
 *   pnpm seed                         # writes (not a dry run by default)
 *   pnpm seed --dry-run               # report only, no writes
 *   pnpm seed --env=staging           # label the run; required for --confirm-production gating
 *   pnpm seed --env=prod --confirm-production
 *   pnpm seed --allow-count-mismatch  # do not fail if the accepted count isn't 96
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { normalizePhone } from "@/domain/phone";
import { NumberRepository } from "@/server/repositories/number-repository";

export const EXPECTED_ACCEPTED_COUNT = 96;
const SOURCE_PATH = "data/seed/numbers.source.txt";

export interface Args {
  dryRun: boolean;
  env: "dev" | "staging" | "prod";
  allowCountMismatch: boolean;
  confirmProduction: boolean;
}

export function parseArgs(argv: string[]): Args {
  const flags = new Set(argv);
  const envArg = argv.find((a) => a.startsWith("--env="));
  return {
    dryRun: flags.has("--dry-run"),
    env: (envArg?.split("=")[1] as Args["env"]) ?? "dev",
    allowCountMismatch: flags.has("--allow-count-mismatch"),
    confirmProduction: flags.has("--confirm-production"),
  };
}

export interface RejectedEntry {
  raw: string;
  position: number;
  reason: string;
}

export interface DuplicateEntry {
  value: string;
  positions: number[];
}

export interface ReconciliationReport {
  timestamp: string;
  env: string;
  dryRun: boolean;
  sourceCount: number;
  acceptedCount: number;
  rejected: RejectedEntry[];
  duplicates: DuplicateEntry[];
  written: number;
  alreadyPresent: number;
  countMismatch: boolean;
}

/** Pure reconciliation logic — no I/O, fully unit-testable. */
export function reconcile(rawLines: string[]): {
  accepted: string[];
  rejected: RejectedEntry[];
  duplicates: DuplicateEntry[];
} {
  const accepted: string[] = [];
  const rejected: RejectedEntry[] = [];
  const seenAtPositions = new Map<string, number[]>();

  rawLines.forEach((raw, index) => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return; // blank lines are not "entries" at all
    const position = index + 1;
    const result = normalizePhone(trimmed);
    if (!result.ok || result.value === null) {
      rejected.push({ raw: trimmed, position, reason: result.reason ?? "Tidak valid." });
      return;
    }
    const positions = seenAtPositions.get(result.value) ?? [];
    positions.push(position);
    seenAtPositions.set(result.value, positions);
  });

  const duplicates: DuplicateEntry[] = [];
  for (const [value, positions] of seenAtPositions) {
    if (positions.length > 1) {
      duplicates.push({ value, positions });
    } else {
      accepted.push(value);
    }
  }

  return { accepted, rejected, duplicates };
}

/**
 * Runs the full reconcile-then-write flow against an injected repository,
 * given raw source text directly — this is what both the CLI entrypoint
 * and the integration tests call, so a test never has to fork a process
 * or fight `process.exit` (B056).
 */
export async function runSeed(
  rawContent: string,
  args: Args,
  repo: NumberRepository,
): Promise<ReconciliationReport> {
  const rawLines = rawContent.split("\n");
  const { accepted, rejected, duplicates } = reconcile(rawLines);

  const report: ReconciliationReport = {
    timestamp: new Date().toISOString(),
    env: args.env,
    dryRun: args.dryRun,
    sourceCount: rawLines.filter((l) => l.trim().length > 0).length,
    acceptedCount: accepted.length,
    rejected,
    duplicates,
    written: 0,
    alreadyPresent: 0,
    countMismatch: accepted.length !== EXPECTED_ACCEPTED_COUNT,
  };

  if (report.countMismatch && !args.allowCountMismatch) {
    return report;
  }

  if (!args.dryRun) {
    for (const number of accepted) {
      const outcome = await repo.createIfAbsent({
        number,
        status: "available",
        reserved_at: null,
        reserved_until: null,
        session_id: null,
        reservation_id: null,
        order_ref: null,
        tracking_token_hash: null,
        sold_at: null,
        sold_channel: null,
        updated_at: new Date(),
      });
      if (outcome === "created") {
        report.written += 1;
      } else {
        report.alreadyPresent += 1;
      }
    }
  }

  return report;
}

export function formatReportMarkdown(report: ReconciliationReport): string {
  return [
    `# Seed Run Report`,
    ``,
    `- Timestamp: ${report.timestamp}`,
    `- Environment: ${report.env}`,
    `- Dry run: ${report.dryRun}`,
    `- Source count: ${report.sourceCount}`,
    `- Accepted: ${report.acceptedCount}`,
    `- Rejected: ${report.rejected.length}`,
    `- Duplicate values: ${report.duplicates.length}`,
    `- Written: ${report.written}`,
    `- Already present: ${report.alreadyPresent}`,
    ``,
    `## Rejected entries`,
    ``,
    report.rejected.length === 0
      ? "None."
      : report.rejected
          .map((r) => `- Position ${r.position}: \`${r.raw}\` — ${r.reason}`)
          .join("\n"),
    ``,
    `## Duplicate values`,
    ``,
    report.duplicates.length === 0
      ? "None."
      : report.duplicates
          .map((d) => `- \`${d.value}\` at positions ${d.positions.join(", ")}`)
          .join("\n"),
    ``,
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.env === "prod" && !args.confirmProduction) {
    console.error("Refusing to run against prod without --confirm-production. See DEPLOYMENT.md.");
    process.exit(1);
  }

  const rawContent = readFileSync(SOURCE_PATH, "utf8");
  const repo = new NumberRepository();
  const report = await runSeed(rawContent, args, repo);

  mkdirSync("docs/reports", { recursive: true });
  const path = `docs/reports/seed-run-${report.timestamp.replace(/[:.]/g, "-")}.md`;
  writeFileSync(path, formatReportMarkdown(report));
  console.log(`Report written to ${path}`);
  console.log(
    `source=${report.sourceCount} accepted=${report.acceptedCount} rejected=${report.rejected.length} ` +
      `duplicates=${report.duplicates.length} written=${report.written} already_present=${report.alreadyPresent}`,
  );

  if (report.countMismatch && !args.allowCountMismatch) {
    console.error(
      `Accepted count ${report.acceptedCount} does not match the expected ${EXPECTED_ACCEPTED_COUNT} ` +
        `(ADR-008). Re-run with --allow-count-mismatch if this is a deliberate dataset change.`,
    );
    process.exit(1);
  }
}

// Only run the CLI entrypoint when this file is executed directly — not
// when `runSeed`/`reconcile` are imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0)) // postgres.js's connection pool otherwise keeps the process alive indefinitely.
    .catch((error) => {
      console.error("Seed run failed:", error);
      process.exit(1);
    });
}
