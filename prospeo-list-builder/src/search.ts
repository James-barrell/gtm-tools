// Core search orchestration: dry-run first, paginate second, state-split when
// the US cap is in play. Dedup across everything by LinkedIn URL and email.

import { ProspeoClient, type ProspeoResult } from "./client.js";
import {
  cloneFilters,
  type FilterSpec,
  type ProspeoFilters,
} from "./filters.js";
import { resultToRow, writeCSV } from "./csv.js";
import { US_COUNTRY_TOKEN, US_STATES, stateLocationToken } from "./states.js";

const PER_PAGE = 25;
const STATE_SPLIT_THRESHOLD = 20_000;

export interface DryRunSummary {
  totalCount: number;
  totalPages: number;
  needsStateSplit: boolean;
  estimatedCredits: number;
}

export interface SearchSummary {
  contactsPulled: number;
  creditsUsed: number;
  duplicatesSkipped: number;
  outputFile: string;
  stateBreakdown?: Array<{ state: string; total: number; pulled: number }>;
}

/**
 * Hit page 1 to get total_count, decide whether we need state splitting, and
 * return an estimate. Does NOT persist results. Costs 1 credit (assuming the
 * search returns at least one result).
 */
export async function dryRun(
  client: ProspeoClient,
  spec: FilterSpec,
  opts: { maxResults?: number } = {}
): Promise<DryRunSummary> {
  const firstPage = await client.searchPage(spec.filters, 1);

  if (firstPage.error) {
    if (firstPage.error_code === "NO_RESULTS") {
      return {
        totalCount: 0,
        totalPages: 0,
        needsStateSplit: false,
        estimatedCredits: 0,
      };
    }
    throw new Error(
      `Prospeo dry-run failed: ${firstPage.error_code ?? "unknown"} ${firstPage.message ?? ""}`.trim()
    );
  }

  const totalCount = firstPage.pagination?.total_count ?? 0;
  const totalPages = firstPage.pagination?.total_page ?? 0;
  const needsStateSplit = shouldSplitByState(totalCount, spec.filters);

  const cappedPages = opts.maxResults
    ? Math.min(Math.ceil(opts.maxResults / PER_PAGE), totalPages)
    : totalPages;

  // Page 1 already cost us 1 credit. Subsequent pages cost 1 each.
  // If state-splitting, we'll need a page 1 per state (up to 50) plus
  // their paginated tails, which we can't know until we hit them.
  const estimatedCredits = needsStateSplit
    ? Math.max(1, cappedPages)
    : Math.max(1, cappedPages);

  return {
    totalCount,
    totalPages,
    needsStateSplit,
    estimatedCredits,
  };
}

/**
 * Full paginated pull. Writes the CSV to outputFile when done.
 */
export async function runSearch(
  client: ProspeoClient,
  spec: FilterSpec,
  outputFile: string,
  opts: { maxResults?: number } = {}
): Promise<SearchSummary> {
  const dedup = new Dedup();
  const rows: string[][] = [];
  let creditsUsed = 0;

  // Always run the first page to discover the total count. This is also the
  // dry-run call, so we avoid double-charging when run() is called directly.
  const first = await client.searchPage(spec.filters, 1);
  creditsUsed += countsAsCredit(first) ? 1 : 0;

  if (first.error) {
    if (first.error_code === "NO_RESULTS") {
      writeCSV(outputFile, rows);
      return { contactsPulled: 0, creditsUsed, duplicatesSkipped: 0, outputFile };
    }
    throw new Error(
      `Prospeo search failed: ${first.error_code ?? "unknown"} ${first.message ?? ""}`.trim()
    );
  }

  const totalCount = first.pagination?.total_count ?? 0;
  const totalPages = first.pagination?.total_page ?? 0;

  if (shouldSplitByState(totalCount, spec.filters)) {
    const stateSummary = await runStateSplit(client, spec, rows, dedup, opts);
    writeCSV(outputFile, rows);
    return {
      contactsPulled: rows.length,
      creditsUsed: creditsUsed + stateSummary.credits,
      duplicatesSkipped: dedup.duplicatesSkipped,
      outputFile,
      stateBreakdown: stateSummary.breakdown,
    };
  }

  // Straight pagination path. Consume page 1 results, then walk the rest.
  consumeResults(first.results ?? [], rows, dedup);

  const pagesToFetch = opts.maxResults
    ? Math.min(Math.ceil(opts.maxResults / PER_PAGE), totalPages)
    : totalPages;

  for (let page = 2; page <= pagesToFetch; page++) {
    if (opts.maxResults && rows.length >= opts.maxResults) break;
    const next = await client.searchPage(spec.filters, page);
    if (next.error) {
      console.error(
        `  [warn] page ${page} returned error ${next.error_code ?? "unknown"}: ${next.message ?? ""}`
      );
      break;
    }
    if (countsAsCredit(next)) creditsUsed += 1;
    consumeResults(next.results ?? [], rows, dedup);
    if (page % 10 === 0 || page === pagesToFetch) {
      console.error(
        `  page ${page}/${pagesToFetch} — ${rows.length.toLocaleString()} contacts so far`
      );
    }
  }

  writeCSV(outputFile, rows);
  return {
    contactsPulled: rows.length,
    creditsUsed,
    duplicatesSkipped: dedup.duplicatesSkipped,
    outputFile,
  };
}

async function runStateSplit(
  client: ProspeoClient,
  spec: FilterSpec,
  rows: string[][],
  dedup: Dedup,
  opts: { maxResults?: number }
): Promise<{ credits: number; breakdown: SearchSummary["stateBreakdown"] }> {
  const breakdown: NonNullable<SearchSummary["stateBreakdown"]> = [];
  let credits = 0;

  for (let i = 0; i < US_STATES.length; i++) {
    if (opts.maxResults && rows.length >= opts.maxResults) break;

    const state = US_STATES[i]!;
    const stateFilters = replaceUSWithState(spec.filters, state);

    const first = await client.searchPage(stateFilters, 1);
    if (first.error) {
      if (first.error_code === "NO_RESULTS") {
        breakdown.push({ state, total: 0, pulled: 0 });
        console.error(`  [${i + 1}/50] ${state}: 0 results`);
        continue;
      }
      console.error(
        `  [${i + 1}/50] ${state}: error ${first.error_code ?? "unknown"} ${first.message ?? ""}`
      );
      continue;
    }
    if (countsAsCredit(first)) credits += 1;

    const startCount = rows.length;
    consumeResults(first.results ?? [], rows, dedup);

    const stateTotal = first.pagination?.total_count ?? 0;
    const statePages = first.pagination?.total_page ?? 0;

    for (let page = 2; page <= statePages; page++) {
      if (opts.maxResults && rows.length >= opts.maxResults) break;
      const next = await client.searchPage(stateFilters, page);
      if (next.error) {
        console.error(
          `  [${state}] page ${page} error ${next.error_code ?? "unknown"}`
        );
        break;
      }
      if (countsAsCredit(next)) credits += 1;
      consumeResults(next.results ?? [], rows, dedup);
    }

    const pulled = rows.length - startCount;
    breakdown.push({ state, total: stateTotal, pulled });
    console.error(
      `  [${i + 1}/50] ${state}: ${stateTotal.toLocaleString()} total, ${pulled.toLocaleString()} pulled, ${rows.length.toLocaleString()} running`
    );
  }

  return { credits, breakdown };
}

function replaceUSWithState(filters: ProspeoFilters, state: string): ProspeoFilters {
  const clone = cloneFilters(filters);
  const loc = clone.person_location_search;
  if (loc?.include) {
    loc.include = loc.include.map((l) =>
      l === US_COUNTRY_TOKEN ? stateLocationToken(state) : l
    );
  }
  return clone;
}

function shouldSplitByState(totalCount: number, filters: ProspeoFilters): boolean {
  if (totalCount <= STATE_SPLIT_THRESHOLD) return false;
  const include = filters.person_location_search?.include ?? [];
  return include.includes(US_COUNTRY_TOKEN);
}

function consumeResults(results: ProspeoResult[], rows: string[][], dedup: Dedup): void {
  for (const r of results) {
    if (dedup.isDuplicate(r)) continue;
    rows.push(resultToRow(r));
  }
}

function countsAsCredit(response: { results?: ProspeoResult[]; error?: boolean }): boolean {
  return !response.error && !!response.results && response.results.length > 0;
}

class Dedup {
  private readonly linkedin = new Set<string>();
  private readonly emails = new Set<string>();
  duplicatesSkipped = 0;

  isDuplicate(r: ProspeoResult): boolean {
    const li = r.person?.linkedin_url;
    // Email is an object { status, email: "m******@foo.com", ... } in search
    // results, and the string is redacted, but still unique enough as a
    // secondary dedup key. linkedin_url is the primary.
    const em = r.person?.email?.email;
    if (li && this.linkedin.has(li)) {
      this.duplicatesSkipped += 1;
      return true;
    }
    if (em && this.emails.has(em)) {
      this.duplicatesSkipped += 1;
      return true;
    }
    if (li) this.linkedin.add(li);
    if (em) this.emails.add(em);
    return false;
  }
}
