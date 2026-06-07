# Prospeo List Builder

A CLI for building B2B lead lists via the [Prospeo](https://prospeo.io) people search API. Takes typed filter specs, handles pagination, rate limiting, deduplication, and automatic state-by-state splitting for large US searches.

Built to be driven by the `/list-build` Claude skill (see the `list-build-skill/` folder in this repo), but works standalone too.

## Setup

```bash
cd prospeo-list-builder
npm install
cp .env.example .env.local
# paste your Prospeo API key into .env.local
```

Your `.env.local` should look like:
```
PROSPEO_API_KEY=your_key_here
```

Get your API key at app.prospeo.io under your profile > API.

## Smoke test

Verifies auth and connectivity. Costs 1 credit.

```bash
npm run smoke
```

## Running a search

Searches are defined as JSON filter specs in `filters/`. See `examples/filter-spec.json` for the shape.

**Dry run (1 credit, no CSV written):**
```bash
npm run search -- --spec filters/my-search.json
```

Reports total result count, whether state splitting is needed, and estimated credit cost.

**Full pull:**
```bash
npm run search -- --spec filters/my-search.json --out outputs/my-search.csv --confirm
```

**Capped pull:**
```bash
npm run search -- --spec filters/my-search.json --out outputs/my-search.csv --confirm --max-results 5000
```

## Enrich (reveal real emails)

Prospeo's search results return masked emails. Run the enrich step to unlock them.

```bash
npm run enrich -- --in outputs/my-search.csv --out outputs/my-search-enriched.csv --confirm
```

Costs 1 credit per email found. No charge on misses.

## Filter spec shape

```json
{
  "name": "saas-vp-sales-us",
  "description": "VP Sales at B2B SaaS companies, 50-500 employees, US",
  "filters": {
    "person_job_title": {
      "include": ["VP Sales", "Head of Sales"],
      "exclude": ["Intern", "Assistant"]
    },
    "company_industry": {
      "include": ["Software Development"]
    },
    "company_headcount_custom": { "min": 50, "max": 500 },
    "person_location_search": { "include": ["United States #US"] },
    "person_contact_details": { "email": ["VERIFIED"] }
  }
}
```

See the [Prospeo filter docs](https://prospeo.io/api-docs/filters-documentation) for the full list of supported fields.

## Credit model

- 1 credit per API request that returns at least one result
- 25 results per page, max 1,000 pages per search (25K hard cap)
- A 25K pull costs ~1,000 credits
- US-wide searches over 20K auto-split by state to bypass the cap

## Output

CSV with columns: `first_name`, `last_name`, `full_name`, `job_title`, `linkedin_url`, `email_status`, `email_masked`, `company_name`, `company_domain`, `company_industry`, `company_employee_count`, `company_employee_range`, `person_city`, `person_state`, `person_country`, `company_city`, `company_country`.

Ready for upload to Clay for enrichment or direct import to your sending tool.

## Notes

- `.env.local` is gitignored. Never commit your API key.
- `outputs/` is gitignored so you can dump CSVs freely.
- `filters/` is committed so proven filter specs build up as a reusable library.
