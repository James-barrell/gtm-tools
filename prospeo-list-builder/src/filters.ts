// Typed filter spec for Prospeo people search.
// Structure intentionally mirrors the Prospeo API filter object 1:1 so the
// JSON we write on disk is the same thing we send over the wire, minus
// metadata. Unknown fields are allowed via passthrough so we don't have to
// rebuild this type every time Prospeo adds a filter.

import { readFileSync } from "node:fs";

export interface JobTitleFilter {
  include?: string[];
  exclude?: string[];
  match_only_exact_job_titles?: boolean;
}

export interface IncludeExcludeStrings {
  include?: string[];
  exclude?: string[];
}

export interface CompanyKeywordsFilter {
  include?: string[];
  exclude?: string[];
  /** If true, a company must match ALL include keywords, not ANY. */
  include_all?: boolean;
}

export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface ContactDetailsFilter {
  email?: Array<"VERIFIED" | "UNVERIFIED" | "ANY">;
  mobile?: Array<"TRUE" | "FALSE">;
  operator?: "AND" | "OR";
}

export interface ProspeoFilters {
  // Person
  person_job_title?: JobTitleFilter;
  person_seniority?: IncludeExcludeStrings;
  person_department?: IncludeExcludeStrings;
  person_location_search?: IncludeExcludeStrings;
  person_contact_details?: ContactDetailsFilter;
  person_year_of_experience?: RangeFilter;
  person_time_in_current_role?: RangeFilter;
  person_time_in_current_company?: RangeFilter;
  max_person_per_company?: number;

  // Company
  company_industry?: IncludeExcludeStrings;
  company_keywords?: CompanyKeywordsFilter;
  company_headcount_range?: IncludeExcludeStrings;
  company_headcount_custom?: RangeFilter;
  company_location_search?: IncludeExcludeStrings;
  company_websites?: string[];
  company_names?: string[];
  company_technology?: IncludeExcludeStrings;
  company_naics?: IncludeExcludeStrings;
  company_sics?: IncludeExcludeStrings;
  company_revenue?: { min?: string; max?: string };
  company_type?: string;
  company_email_provider?: IncludeExcludeStrings;

  // Passthrough for anything we haven't modelled yet.
  [key: string]: unknown;
}

export interface FilterSpec {
  /** Short kebab-case name, used to build output filenames. */
  name: string;
  /** Human readable one-liner describing the search. */
  description?: string;
  /** Freeform notes for the next person reading this file. */
  notes?: string;
  /** The actual Prospeo filter payload. */
  filters: ProspeoFilters;
}

export function loadFilterSpec(path: string): FilterSpec {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as FilterSpec;
  validateSpec(parsed);
  return parsed;
}

export function validateSpec(spec: FilterSpec): void {
  if (!spec || typeof spec !== "object") {
    throw new Error("Filter spec must be an object.");
  }
  if (!spec.name || typeof spec.name !== "string") {
    throw new Error("Filter spec is missing a 'name' field.");
  }
  if (!spec.filters || typeof spec.filters !== "object") {
    throw new Error("Filter spec is missing a 'filters' object.");
  }
  if (!hasAnyPositiveFilter(spec.filters)) {
    throw new Error(
      "Filter spec must include at least one positive filter. " +
        "Prospeo does not accept searches with only exclude filters."
    );
  }
}

/**
 * Prospeo rejects searches that use only exclude filters. Walk the spec and
 * confirm there's at least one include/positive constraint somewhere.
 */
function hasAnyPositiveFilter(filters: ProspeoFilters): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    // Array-valued filters like company_websites, company_names.
    if (Array.isArray(value) && value.length > 0) return true;

    // Scalar filters.
    if (typeof value === "string" || typeof value === "number") return true;

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj.include) && obj.include.length > 0) return true;
      if (typeof obj.min === "number" || typeof obj.max === "number") return true;
      // person_contact_details has array fields directly.
      if (Array.isArray(obj.email) && obj.email.length > 0) return true;
      if (Array.isArray(obj.mobile) && obj.mobile.length > 0) return true;
      // max_person_per_company is a raw number, already handled above.
      if (key === "person_contact_details") continue;
    }
  }
  return false;
}

/**
 * Deep clone a filter object. Used when we need to mutate per-state copies
 * without touching the original.
 */
export function cloneFilters(filters: ProspeoFilters): ProspeoFilters {
  return JSON.parse(JSON.stringify(filters)) as ProspeoFilters;
}
