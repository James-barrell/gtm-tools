# Prospeo Search Person API Reference

Digested from https://prospeo.io/api-docs as of 2026-04-14. Verified against live smoke tests.

## Endpoint

- **Method**: POST
- **URL**: `https://api.prospeo.io/search-person`
- **Auth**: `X-KEY: {api_key}` header
- **Content-Type**: `application/json`

## Request body

```json
{
  "page": 1,
  "filters": {
    "person_job_title": { "include": ["CEO"], "exclude": ["Intern"] },
    "person_location_search": { "include": ["United States #US"] }
  }
}
```

Must include `filters` (object). Must include at least one positive filter. Searches using only exclude filters return `INVALID_FILTERS`.

## Response shape

```json
{
  "error": false,
  "results": [
    { "person": { ... }, "company": { ... } }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 25,
    "total_page": 735,
    "total_count": 18375
  }
}
```

On error:
```json
{ "error": true, "error_code": "INVALID_FILTERS", "message": "..." }
```

## Error codes

| Code | Meaning | How to fix |
|---|---|---|
| `INVALID_FILTERS` | A filter value or structure is rejected | Most common cause: bad `company_industry` enum. Remove industry and try `company_keywords` instead |
| `NO_RESULTS` | No matches | Loosen filters |
| `INSUFFICIENT_CREDITS` | Out of credits | Top up |
| `INVALID_API_KEY` | Bad auth | Check `.env.local` |
| `RATE_LIMITED` | 429 | Handled automatically with exponential backoff |

## Pagination

- 25 results per page
- Max 1000 pages (25,000 results per search)
- For US-wide searches above 20K, split by state (CLI handles this)

## Credits

- 1 credit per request that returns at least one result
- Page 1 can be used as dry-run because `pagination.total_count` is present
- 25K search ≈ 1000 credits
- State-split multiplies by up to 50 additional page-1 calls

## Person object (actual response shape)

From live smoke test, keys are:
```
person_id, first_name, last_name, full_name, linkedin_url,
current_job_title, current_job_key, headline, linkedin_member_id,
last_job_change_detected_at, job_history, mobile, email, location, skills
```

- `email` is an OBJECT: `{ status, revealed, email, verification_method, email_mx_provider }`. The `email` field inside is REDACTED (e.g. `m*****@example.com`).
- `mobile` is an OBJECT with similar shape.
- `location` has `{ country, country_code, state, city, time_zone, time_zone_offset }`.
- `job_history` is an array of prior roles with departments, seniority, durations.

**Both email and mobile require the separate `/enrich-person` (or `/bulk-enrich-person`) endpoint to unlock.** This is the default Litehouse flow: after the search pull, run `npm run enrich -- --in <search.csv> --out <enriched.csv> --confirm` to reveal the real verified emails (1 credit per email found, no charge on misses). The enrich command matches on `linkedin_url`. Clay is an alternative but Prospeo's own enrich is the standard path. Note: Prospeo signals rate limits both as HTTP 429 and as a 200 with `{ error_code: "Rate limit exceeded" }`, so the enrich client backs off on both.

## Company object (actual response shape)

From live smoke test, keys are:
```
company_id, name, website, domain, other_websites, description,
description_seo, description_ai, type, industry, employee_count,
employee_count_on_prospeo, employee_range, location, sic_codes,
naics_codes, email_tech, linkedin_url, twitter_url, facebook_url,
crunchbase_url, instagram_url, youtube_url, phone_hq, linkedin_id,
founded, revenue_range, revenue_range_printed, keywords, logo_url,
attributes, funding, technology, job_postings
```

- `employee_count` is the integer, `employee_range` is the bucket string ("51-100")
- `technology` is an OBJECT: `{ count, technology_names: [...], technology_list: [{ name, category }, ...] }`. Not a flat array.
- `revenue_range_printed` is a friendly string like "5M". `revenue_range` is `{ min, max }`.
- `description_seo` and `description_ai` are often cleaner than raw `description`.

## Filter fields

### Person filters

| Filter | Type | Include/Exclude | Notes |
|---|---|---|---|
| `person_job_title` | `{ include?, exclude?, match_only_exact_job_titles? }` | yes | Supports boolean `(CEO OR VP Sales) AND !Intern` inline. Fuzzy by default. |
| `person_seniority` | `{ include?, exclude? }` | yes | Enum: C-Suite, VP, Director, Manager, Entry, etc. |
| `person_department` | `{ include?, exclude? }` | yes | Enum: Sales, Marketing, Engineering & Technical, etc. |
| `person_location_search` | `{ include?, exclude? }` | yes | Exact location string, see below |
| `person_contact_details` | `{ email?: ["VERIFIED"], mobile?: ["TRUE"] }` | no | Filter by email/mobile availability |
| `person_year_of_experience` | `{ min?, max? }` | no | Numeric years |
| `person_time_in_current_role` | `{ min?, max? }` | no | Months in role (0-600) |
| `person_time_in_current_company` | `{ min?, max? }` | no | Months at company (0-600) |
| `max_person_per_company` | integer 1-100 | no | Cap results per company |

### Company filters

| Filter | Type | Include/Exclude | Notes |
|---|---|---|---|
| `company_industry` | `{ include?, exclude? }` | yes | **Exact enum values required.** See "Known-good enums" below. Bad values return `INVALID_FILTERS`. |
| `company_keywords` | `{ include?, exclude?, include_all? }` | yes | Matches company descriptions and SEO. Eden's preferred filter for niche targeting. |
| `company_headcount_range` | `{ include? }` | no | Enum: "51-100", "101-200", "201-500", etc. |
| `company_headcount_custom` | `{ min?, max? }` | no | Numeric range 1-999,999. Verified working. |
| `company_location_search` | `{ include?, exclude? }` | yes | HQ location |
| `company_websites` | array of URLs (max 500) | no | Domain-to-people lookup (Clay handoff) |
| `company_names` | array of names (max 500) | no | Target specific companies |
| `company_technology` | `{ include?, exclude? }` | yes | Enum: Salesforce, HubSpot, AWS, etc. |
| `company_naics` | `{ include?, exclude? }` | yes | Numeric NAICS codes |
| `company_sics` | `{ include?, exclude? }` | yes | Numeric SIC codes |
| `company_revenue` | `{ min?, max? }` | no | Revenue band strings like "10M" |
| `company_type` | string | no | "Private", "Public", "Non Profit", "Other" |
| `company_email_provider` | `{ include?, exclude? }` | no | "Google", "Microsoft" |

## Location format

Must be exact Prospeo strings:

- Country: `"United States #US"`, `"United Kingdom #GB"`, `"Canada #CA"`
- State: `"California, United States #US"`
- City: `"San Francisco, California, United States #US"`

## Known-good enum values (verified live)

### company_industry
- `"Software Development"` ✅
- `"Banking"` ✅
- `"Medical Equipment Manufacturing"` ✅ (observed in results)
- `"Computer & Network Security"` ❌ (returns INVALID_FILTERS, enum value is wrong)

**When in doubt, omit `company_industry` and use `company_keywords` instead.** Keyword matching is more forgiving and often more accurate anyway because LinkedIn's self-reported industries are noisy.

**Critical: keywords match how a company describes itself, NOT its business model.** No company calls itself an "e-commerce store" or a "SaaS company" in its own description. A clothing brand calls itself a clothing brand. A phone case maker calls itself a phone case maker. A CRM tool calls itself a CRM tool. Searching `company_keywords` for "e-commerce" or "saas" misses almost everyone. Use these signals instead:
- For e-commerce: `company_technology` filter (Shopify, WooCommerce, Magento, BigCommerce, Klaviyo, etc)
- For SaaS: `company_technology` filter (HubSpot, Salesforce, Stripe, AWS) or `company_industry: "Software Development"`
- For business model targeting in general, prefer tech stack over keywords. Keywords are for what the company actually sells (e.g. "skincare", "B2B legal", "freight").

### person_contact_details.email
- `"VERIFIED"` ✅

### person_seniority (from docs, not all verified)
- `"C-Suite"`, `"Vice President"`, `"Director"`, `"Manager"`, `"Senior"`, `"Entry"`

### company_headcount_range (from docs)
- `"1-10"`, `"11-50"`, `"51-100"`, `"101-200"`, `"201-500"`, `"501-1000"`, `"1001-5000"`, `"5001-10000"`, `"10001+"`

## Constraints

- Max 20,000 total filter values across the entire spec
- Max 500 items per individual filter (unless noted otherwise)
- Rate limit: plan-dependent, surfaced in response headers. CLI uses 500ms between calls (2 req/sec) with exponential backoff on 429.

## How to discover exact industry enum values

If you need to use `company_industry` and don't know the exact string, two options:

1. **Use the Prospeo web UI** at app.prospeo.io/app/search and let the autocomplete suggest valid values, then copy them verbatim.
2. **Use `company_keywords` instead.** Matches on company descriptions, which is more forgiving and often catches companies the industry filter misses.

## Reference links

- Main docs: https://prospeo.io/api-docs
- Search endpoint: https://prospeo.io/api-docs/search-person
- Filters documentation: https://prospeo.io/api-docs/filters-documentation
- Authentication: https://prospeo.io/api-docs/authentication
- Rate limits: https://prospeo.io/api-docs/rate-limits
- Person object: https://prospeo.io/api-docs/person-object
