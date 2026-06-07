#!/usr/bin/env tsx
// Command line entry. Usage:
//   npm run search -- --spec filters/my-search.json --out outputs/my-search.csv
//   npm run search -- --spec filters/my-search.json --out outputs/my-search.csv --confirm
//   npm run search -- --spec filters/my-search.json --out outputs/my-search.csv --max-results 5000
//
// Without --confirm, the CLI runs only the dry-run (page 1) and prints a cost
// estimate. With --confirm, it runs the full pull.

import { ProspeoClient } from "./client.js";
import { loadFilterSpec } from "./filters.js";
import { dryRun, runSearch } from "./search.js";

interface Args {
  spec?: string;
  out?: string;
  confirm: boolean;
  maxResults?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { confirm: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--spec":
        args.spec = argv[++i];
        break;
      case "--out":
        args.out = argv[++i];
        break;
      case "--confirm":
        args.confirm = true;
        break;
      case "--max-results":
        args.maxResults = Number(argv[++i]);
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
      default:
        if (a?.startsWith("--")) {
          console.error(`Unknown flag: ${a}`);
          printHelp();
          process.exit(2);
        }
    }
  }
  return args;
}

function printHelp(): void {
  console.error(`Usage: prospeo-search --spec <path> --out <path> [--confirm] [--max-results N]

  --spec          Path to a filter spec JSON file (required)
  --out           Path to the CSV output file (required when --confirm is set)
  --confirm       Actually run the full paginated pull. Without this, only a
                  dry-run happens (1 credit) and an estimate is printed.
  --max-results   Hard cap on the number of contacts to pull.
  -h, --help      Show this message.
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.spec) {
    console.error("Missing --spec");
    printHelp();
    process.exit(2);
  }

  const spec = loadFilterSpec(args.spec);
  const client = new ProspeoClient();

  console.error(`Loaded spec: ${spec.name}`);
  if (spec.description) console.error(`  ${spec.description}`);
  console.error("");

  if (!args.confirm) {
    console.error("Running dry-run (1 credit)...");
    const preview = await dryRun(client, spec, { maxResults: args.maxResults });

    console.error("");
    console.error("=== Dry run summary ===");
    console.error(`  Total results:      ${preview.totalCount.toLocaleString()}`);
    console.error(`  Total pages:        ${preview.totalPages.toLocaleString()}`);
    console.error(`  Needs state split:  ${preview.needsStateSplit ? "yes (US > 20K cap)" : "no"}`);
    console.error(`  Estimated credits:  ~${preview.estimatedCredits.toLocaleString()}`);
    if (args.maxResults) {
      console.error(`  Max results cap:    ${args.maxResults.toLocaleString()}`);
    }
    console.error("");
    console.error("To actually run the pull, re-run with --confirm and --out <path>");
    return;
  }

  if (!args.out) {
    console.error("--confirm requires --out <path>");
    process.exit(2);
  }

  console.error("Running full search...");
  const summary = await runSearch(client, spec, args.out, { maxResults: args.maxResults });

  console.error("");
  console.error("=== Search complete ===");
  console.error(`  Contacts pulled:    ${summary.contactsPulled.toLocaleString()}`);
  console.error(`  Credits used:       ${summary.creditsUsed.toLocaleString()}`);
  console.error(`  Duplicates skipped: ${summary.duplicatesSkipped.toLocaleString()}`);
  console.error(`  Output file:        ${summary.outputFile}`);

  if (summary.stateBreakdown && summary.stateBreakdown.length > 0) {
    console.error("");
    console.error("State breakdown:");
    for (const s of summary.stateBreakdown) {
      if (s.pulled > 0) {
        console.error(`  ${s.state.padEnd(18)} ${s.pulled.toLocaleString()} pulled / ${s.total.toLocaleString()} total`);
      }
    }
  }
}

main().catch((err) => {
  console.error("");
  console.error("ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
