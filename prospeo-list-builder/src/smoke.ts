#!/usr/bin/env tsx
// Smoke test: calls the Prospeo API with the simplest possible valid filter
// to verify auth, exact field names, and response shape. Costs 1 credit.
// Run with: npm run smoke

import { ProspeoClient } from "./client.js";

async function main(): Promise<void> {
  const client = new ProspeoClient();

  // Minimal filter that Prospeo should accept. CEO is a common enough title
  // that we're guaranteed a non-zero result set in the US.
  const filters = {
    person_job_title: { include: ["CEO"] },
    person_location_search: { include: ["United States #US"] },
    company_headcount_custom: { min: 50, max: 200 },
  };

  console.error("Smoke test: calling /search-person with minimal filter...");
  const res = await client.searchPage(filters, 1);

  console.error("");
  console.error("=== Response ===");
  console.error(`  error:       ${res.error}`);
  if (res.error) {
    console.error(`  error_code:  ${res.error_code}`);
    console.error(`  message:     ${res.message}`);
    process.exit(1);
  }
  console.error(`  total_count: ${res.pagination?.total_count?.toLocaleString() ?? "?"}`);
  console.error(`  total_page:  ${res.pagination?.total_page ?? "?"}`);
  console.error(`  per_page:    ${res.pagination?.per_page ?? "?"}`);
  console.error(`  results:     ${res.results?.length ?? 0} on page 1`);

  const first = res.results?.[0];
  if (first) {
    console.error("");
    console.error("First result shape:");
    console.error("  person keys:  ", Object.keys(first.person ?? {}).join(", "));
    console.error("  company keys: ", Object.keys(first.company ?? {}).join(", "));
    console.error("");
    console.error("Sample person:");
    console.error(JSON.stringify(first.person, null, 2));
    console.error("");
    console.error("Sample company:");
    console.error(JSON.stringify(first.company, null, 2));
  }

  console.error("");
  console.error("Smoke test passed.");
}

main().catch((err) => {
  console.error("");
  console.error("SMOKE TEST FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
