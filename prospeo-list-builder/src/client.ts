// Prospeo API client. Typed wrapper around /search-person with rate limiting
// and exponential backoff on 429. Keep this file dumb, all the pagination /
// splitting logic lives in search.ts.
//
// NOTE: /search-person returns REDACTED email and mobile values (e.g.
// "m*******@limblab.com"). To get unredacted values, run the enrich step
// (src/enrich.ts -> /bulk-enrich-person). The search results carry names, LinkedIn
// URLs, titles, companies and domains, which is what enrich matches on.

import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProspeoFilters } from "./filters.js";

const API_URL = "https://api.prospeo.io/search-person";
const DEFAULT_RATE_LIMIT_MS = 500; // ~2 req/sec, matches GEX reference
const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 60_000;

// Load .env.local from the project root (relative to this file), falling
// back to .env. We explicitly target .env.local because that's where the
// real key lives and it's gitignored. Standard dotenv only loads .env.
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const localEnv = resolve(projectRoot, ".env.local");
const defaultEnv = resolve(projectRoot, ".env");
if (existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (existsSync(defaultEnv)) {
  dotenv.config({ path: defaultEnv });
}

export interface ProspeoLocation {
  country?: string;
  country_code?: string;
  state?: string;
  city?: string;
  time_zone?: string;
  time_zone_offset?: number;
  raw_address?: string;
}

export interface ProspeoEmail {
  status?: string;
  revealed?: boolean;
  email?: string; // redacted in search results
  verification_method?: string;
  email_mx_provider?: string;
}

export interface ProspeoMobile {
  status?: string;
  revealed?: boolean;
  mobile?: string;
  mobile_national?: string;
  mobile_international?: string;
  mobile_country?: string;
  mobile_country_code?: string;
}

export interface ProspeoPerson {
  person_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  current_job_title?: string;
  current_job_key?: string | null;
  headline?: string;
  linkedin_url?: string;
  linkedin_member_id?: string | null;
  last_job_change_detected_at?: string | null;
  job_history?: unknown[];
  email?: ProspeoEmail;
  mobile?: ProspeoMobile;
  location?: ProspeoLocation;
  skills?: unknown[];
  [key: string]: unknown;
}

export interface ProspeoTechnology {
  count?: number;
  technology_names?: string[];
  technology_list?: Array<{ name: string; category: string }>;
}

export interface ProspeoCompany {
  company_id?: string;
  name?: string;
  website?: string;
  domain?: string;
  other_websites?: string[];
  description?: string;
  description_seo?: string;
  description_ai?: string;
  type?: string;
  industry?: string;
  employee_count?: number;
  employee_count_on_prospeo?: number;
  employee_range?: string;
  location?: ProspeoLocation;
  sic_codes?: string[];
  naics_codes?: string[];
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  founded?: number;
  revenue_range?: { min?: number; max?: number };
  revenue_range_printed?: string;
  keywords?: string[];
  technology?: ProspeoTechnology;
  [key: string]: unknown;
}

export interface ProspeoResult {
  person: ProspeoPerson;
  company: ProspeoCompany;
}

export interface ProspeoPagination {
  current_page: number;
  per_page: number;
  total_page: number;
  total_count: number;
}

export interface ProspeoSearchResponse {
  error: boolean;
  error_code?: string;
  message?: string;
  results?: ProspeoResult[];
  pagination?: ProspeoPagination;
}

export class ProspeoClient {
  private readonly apiKey: string;
  private readonly rateLimitMs: number;
  private lastCallAt = 0;

  constructor(options: { apiKey?: string; rateLimitMs?: number } = {}) {
    const key = options.apiKey ?? process.env.PROSPEO_API_KEY;
    if (!key) {
      throw new Error(
        "PROSPEO_API_KEY is not set. Add it to projects/prospeo-list-builder/.env.local"
      );
    }
    this.apiKey = key;
    this.rateLimitMs = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
  }

  async searchPage(filters: ProspeoFilters, page = 1): Promise<ProspeoSearchResponse> {
    await this.throttle();
    return this.searchWithRetry(filters, page, 0);
  }

  private async searchWithRetry(
    filters: ProspeoFilters,
    page: number,
    retries: number
  ): Promise<ProspeoSearchResponse> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KEY": this.apiKey,
      },
      body: JSON.stringify({ page, filters }),
    });

    if (res.status === 429 && retries < MAX_RETRIES) {
      const backoff = Math.min(2_000 * Math.pow(2, retries), MAX_BACKOFF_MS);
      console.error(`  [rate limited] waiting ${backoff / 1000}s before retry ${retries + 1}`);
      await sleep(backoff);
      return this.searchWithRetry(filters, page, retries + 1);
    }

    let body: ProspeoSearchResponse;
    try {
      body = (await res.json()) as ProspeoSearchResponse;
    } catch {
      throw new Error(`Prospeo API returned non-JSON: ${res.status} ${res.statusText}`);
    }

    if (!res.ok && !body.error) {
      throw new Error(`Prospeo API error: ${res.status} ${res.statusText}`);
    }

    return body;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallAt;
    if (elapsed < this.rateLimitMs) {
      await sleep(this.rateLimitMs - elapsed);
    }
    this.lastCallAt = Date.now();
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
