#!/usr/bin/env tsx
// Bulk-enrich a Prospeo search CSV into REAL verified emails via the
// /bulk-enrich-person endpoint (the search endpoint only returns masked
// emails). Reads a CSV produced by the search CLI, enriches rows by
// linkedin_url, and writes the same CSV back with real `email` +
// `email_verification` columns added.
//
// Usage:
//   npm run enrich -- --in <in.csv> --out <out.csv>            (dry-run: counts + cost estimate, no spend)
//   npm run enrich -- --in <in.csv> --out <out.csv> --confirm  (enriches for real, spends credits)
//
// Flags:
//   --confirm              actually call the API and spend credits
//   --max N                cap the number of rows enriched (use for smoke tests)
//   --include-unavailable  also try rows whose email_status != VERIFIED
//   --mobile               also enrich mobile numbers (10 credits each, email free)
//
// Credit model: 1 credit per verified email found. No charge on misses or
// duplicates enriched within the account lifetime, so only_verified_email
// keeps spend tight.

import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { sleep } from "./client.js"; // importing also loads .env.local

const ENRICH_URL = "https://api.prospeo.io/bulk-enrich-person";
const BATCH_SIZE = 50; // API max
const RATE_LIMIT_MS = 500;
const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 60_000;

interface Args {
  in?: string;
  out?: string;
  confirm: boolean;
  max?: number;
  includeUnavailable: boolean;
  mobile: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { confirm: false, includeUnavailable: false, mobile: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--in": a.in = argv[++i]; break;
      case "--out": a.out = argv[++i]; break;
      case "--confirm": a.confirm = true; break;
      case "--max": a.max = Number(argv[++i]); break;
      case "--include-unavailable": a.includeUnavailable = true; break;
      case "--mobile": a.mobile = true; break;
    }
  }
  return a;
}

const apiKey = process.env.PROSPEO_API_KEY;
if (!apiKey) {
  console.error("PROSPEO_API_KEY is not set. Add it to projects/prospeo-list-builder/.env.local");
  process.exit(1);
}

interface EnrichResponse {
  error?: boolean;
  error_code?: string;
  message?: string;
  total_cost?: number;
  matched?: Array<{ identifier: string; person?: { email?: { status?: string; revealed?: boolean; email?: string } } }>;
  not_matched?: string[];
  invalid_datapoints?: string[];
}

async function enrichBatch(leads: unknown[], retries = 0): Promise<EnrichResponse> {
  const res = await fetch(ENRICH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-KEY": apiKey! },
    body: JSON.stringify({ data: leads }),
  });

  let body: EnrichResponse;
  try {
    body = (await res.json()) as EnrichResponse;
  } catch {
    throw new Error(`Prospeo enrich returned non-JSON: ${res.status} ${res.statusText}`);
  }

  // Prospeo signals rate limits two ways: an HTTP 429, OR a 200 with an error
  // body { error_code: "Rate limit exceeded" }. Catch both and back off.
  const rateLimited =
    res.status === 429 || /rate limit/i.test(`${body.error_code ?? ""} ${body.message ?? ""}`);
  if (rateLimited && retries < MAX_RETRIES) {
    const backoff = Math.min(2_000 * 2 ** retries, MAX_BACKOFF_MS);
    console.error(`  [rate limited] waiting ${backoff / 1000}s before retry ${retries + 1}`);
    await sleep(backoff);
    return enrichBatch(leads, retries + 1);
  }

  return body;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.out) {
    console.error("Usage: npm run enrich -- --in <csv> --out <csv> [--confirm] [--max N] [--include-unavailable] [--mobile]");
    process.exit(2);
  }

  const rows: Record<string, string>[] = parse(readFileSync(args.in), {
    columns: true,
    skip_empty_lines: true,
  });
  const origHeaders = Object.keys(rows[0] ?? {});
  console.error(`Loaded ${rows.length.toLocaleString()} rows from ${args.in}`);

  // every row gets the new columns, blank by default
  for (const r of rows) {
    r.email = r.email ?? "";
    r.email_verification = r.email_verification ?? "";
  }

  let candidates = rows.filter((r) => (r.linkedin_url || "").trim());
  if (!args.includeUnavailable) candidates = candidates.filter((r) => r.email_status === "VERIFIED");
  // Skip rows that already have a real email, so re-runs only fill the gaps
  // (idempotent, and free since Prospeo won't recharge already-enriched leads).
  candidates = candidates.filter((r) => !(r.email || "").trim());
  if (args.max) candidates = candidates.slice(0, args.max);

  console.error(
    `Candidates: ${candidates.length.toLocaleString()} rows (have linkedin_url${args.includeUnavailable ? "" : " + VERIFIED status"})`
  );

  if (!args.confirm) {
    console.error("");
    console.error("=== Dry run (no spend) ===");
    console.error(`  Would enrich:    ${candidates.length.toLocaleString()} rows`);
    console.error(`  Max credit cost: ~${candidates.length.toLocaleString()} (1 per verified email found, no charge on misses)`);
    console.error("");
    console.error("Re-run with --confirm to enrich for real.");
    return;
  }

  candidates.forEach((r, i) => { (r as Record<string, string>).__id = String(i); });
  const byId = new Map(candidates.map((r) => [(r as Record<string, string>).__id, r]));

  let found = 0;
  let notMatched = 0;
  let credits = 0;
  const batches = Math.ceil(candidates.length / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const slice = candidates.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const leads = slice.map((r) => ({
      identifier: (r as Record<string, string>).__id,
      linkedin_url: r.linkedin_url,
      only_verified_email: true,
      ...(args.mobile ? { enrich_mobile: true } : {}),
    }));

    await sleep(RATE_LIMIT_MS);
    const resp = await enrichBatch(leads);

    if (resp.error) {
      console.error(`  batch ${b + 1}/${batches} ERROR: ${resp.error_code ?? ""} ${resp.message ?? JSON.stringify(resp).slice(0, 300)}`);
      continue;
    }

    credits += resp.total_cost ?? 0;
    for (const m of resp.matched ?? []) {
      const row = byId.get(m.identifier);
      if (!row) continue;
      const em = m.person?.email;
      if (em?.email && em.revealed !== false) {
        row.email = em.email;
        row.email_verification = em.status ?? "";
        found++;
      }
    }
    notMatched += resp.not_matched?.length ?? 0;

    if ((b + 1) % 5 === 0 || b === batches - 1) {
      console.error(`  batch ${b + 1}/${batches} — ${found.toLocaleString()} emails, ${credits.toLocaleString()} credits`);
    }
  }

  const headers = [...origHeaders.filter((h) => h !== "email" && h !== "email_verification"), "email", "email_verification"];
  const out = stringify(rows, { header: true, columns: headers });
  writeFileSync(args.out, out, "utf8");

  console.error("");
  console.error("=== Enrichment complete ===");
  console.error(`  Real emails found: ${found.toLocaleString()}`);
  console.error(`  Not matched:       ${notMatched.toLocaleString()}`);
  console.error(`  Credits used:      ${credits.toLocaleString()}`);
  console.error(`  Output file:       ${args.out}`);
}

main().catch((err) => {
  console.error("");
  console.error("ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
