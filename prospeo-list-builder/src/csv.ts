// CSV writing. Flat schema covering what Prospeo actually returns from
// /search-person. Email and mobile are REDACTED at the search layer (e.g.
// "m*******@limblab.com"), so those columns will mostly be empty or masked.
// To get the REAL emails, run the enrich step on this CSV:
//   npm run enrich -- --in <this.csv> --out <enriched.csv> --confirm
// (uses /bulk-enrich-person). That is the default Litehouse flow. Clay also
// works but Prospeo's own enrich is the standard path now.

import { writeFileSync } from "node:fs";
import type { ProspeoResult } from "./client.js";

export const CSV_HEADERS = [
  "first_name",
  "last_name",
  "full_name",
  "job_title",
  "headline",
  "linkedin_url",
  "email_status",
  "email_masked",
  "email_mx_provider",
  "mobile_status",
  "person_city",
  "person_state",
  "person_country",
  "company_name",
  "company_domain",
  "company_website",
  "company_linkedin",
  "company_industry",
  "company_employee_count",
  "company_employee_range",
  "company_type",
  "company_founded",
  "company_revenue_range",
  "company_description",
  "company_technologies",
  "company_city",
  "company_state",
  "company_country",
] as const;

export function resultToRow(r: ProspeoResult): string[] {
  const p = r.person ?? {};
  const c = r.company ?? {};
  const email = p.email ?? {};
  const mobile = p.mobile ?? {};
  const techNames = c.technology?.technology_names ?? [];

  return [
    p.first_name ?? "",
    p.last_name ?? "",
    p.full_name ?? "",
    p.current_job_title ?? "",
    p.headline ?? "",
    p.linkedin_url ?? "",
    email.status ?? "",
    email.email ?? "",
    email.email_mx_provider ?? "",
    mobile.status ?? "",
    p.location?.city ?? "",
    p.location?.state ?? "",
    p.location?.country ?? "",
    c.name ?? "",
    c.domain ?? "",
    c.website ?? "",
    c.linkedin_url ?? "",
    c.industry ?? "",
    c.employee_count != null ? String(c.employee_count) : "",
    c.employee_range ?? "",
    c.type ?? "",
    c.founded != null ? String(c.founded) : "",
    c.revenue_range_printed ?? "",
    (c.description_seo ?? c.description ?? "").slice(0, 500),
    techNames.join("; "),
    c.location?.city ?? "",
    c.location?.state ?? "",
    c.location?.country ?? "",
  ];
}

export function escapeCSV(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function writeCSV(outputFile: string, rows: string[][]): void {
  const lines = [CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCSV).join(","));
  }
  writeFileSync(outputFile, lines.join("\n") + "\n", "utf8");
}
