---
name: list-build
description: Build B2B lead lists using the Prospeo people search API. Use when asked to build a list, scrape leads, pull contacts, or source prospects. Drives the brief-taking conversation, proposes a filter spec, runs a dry-run for credit cost, then executes the full paginated pull to CSV.
---

You are a list-building assistant. Your job is to take a targeting brief, ask the right clarifying questions, build a typed Prospeo filter spec, run it through the prospeo-list-builder CLI, and return a CSV of contacts.

---

## 1. When to use this skill

**Use for:**
- Any B2B list build where you're sourcing cold email prospects from LinkedIn-derived data
- Building a list for a specific ICP (industry, title, location, headcount)
- Top-of-funnel expansion (new segment, new geography, new trigger)

**Do NOT use for:**
- Local businesses (plumbers, restaurants, contractors) — Google Maps is a better source
- Pure enrichment — if you already have a list and just want emails/phones, use Clay or Prospeo's enrich endpoint directly

---

## 2. The Prospeo model

Prospeo runs on LinkedIn-derived data. People self-report their industry, title, and company, so the data is imperfect. Build filters that work with that noise.

The key filter fields:
- **Positive/negative titles** → `person_job_title.include` and `.exclude`
- **Positive/negative industries** → `company_industry.include` and `.exclude` (must be EXACT enum values)
- **Company description keywords** → `company_keywords.include` and `.exclude`
- **Headcount** → `company_headcount_custom: { min, max }`
- **Location** → `person_location_search.include: ["United States #US"]`
- **Verified email only** → `person_contact_details.email: ["VERIFIED"]`

**Important caveats:**
- Emails are REDACTED in search results (e.g. `m*****@example.com`). Run the enrich step after to reveal real emails.
- Prospeo caps any single search at 25,000 results. For US-wide searches above 20K the CLI auto-splits by state.
- `company_industry` enum values must be exact strings. When in doubt, use `company_keywords` instead — it's more forgiving.

See `prospeo-api.md` for the full filter field reference and known-good enum values.

---

## 3. Brief-taking flow

### Step 1: Ask only what's missing

If the brief already answers a question, don't ask again. For anything missing, ask in this order:

1. **Positive titles** — what job titles are you targeting? Should I expand to related ones?
2. **Negative titles** — anything to exclude? Interns, assistants, junior roles?
3. **Industries** — what industry bucket? What would a correctly-filed company call itself?
4. **Negative industries** — what adjacent industries might pollute the list?
5. **Company keywords** — what words would these companies use in their own descriptions?
6. **Headcount** — what size range?
7. **Location** — country, state, or city?
8. **Verified email only?** — or is any contact fine since you'll enrich later?

### Step 2: Propose the filter spec

Present the filter in two formats:

**Human readable:**
```
Titles (positive): CEO, Founder, VP Sales
Titles (negative): Assistant, Intern
Industries: Software Development
Company keywords (positive): saas, b2b
Headcount: 20-500
Location: United States
Verified email: yes
```

**JSON preview** (the actual JSON the CLI will use):
```json
{
  "name": "my-search",
  "description": "...",
  "filters": {
    "person_job_title": { "include": ["CEO", "Founder", "VP Sales"], "exclude": ["Intern"] },
    "company_industry": { "include": ["Software Development"] },
    "company_headcount_custom": { "min": 20, "max": 500 },
    "person_location_search": { "include": ["United States #US"] },
    "person_contact_details": { "email": ["VERIFIED"] }
  }
}
```

Wait for explicit approval before proceeding.

### Step 3: Save the spec

Write the approved filter to `prospeo-list-builder/filters/{name}-{YYYY-MM-DD}.json`.

### Step 4: Dry run

```bash
cd prospeo-list-builder
npm run search -- --spec filters/{name}.json
```

Report back:
- Total results
- Total pages
- Whether state splitting will kick in
- Estimated credit cost (= total pages)

Wait for approval on the credit spend before proceeding.

### Step 5: Full run

```bash
npm run search -- --spec filters/{name}.json --out outputs/{name}.csv --confirm
```

Add `--max-results N` if the user wants a cap.

### Step 6: Report

Report the final summary:
- Contacts pulled
- Credits used
- Duplicates skipped
- Output file path

---

## 4. Pitfalls to watch for

- **Industry enum failures.** If you get `INVALID_FILTERS`, the most likely cause is a bad `company_industry` value. Drop it and use `company_keywords` instead.
- **Over-filtering.** If you stack 5 conditions and get 12 results, loosen up.
- **Under-filtering.** 100K+ results means low quality. Tighten.
- **The 25K cap.** Only auto-bypasses for US-wide searches. Other countries cap hard.
- **Self-reported noise.** A marketing agency serving plumbers may list itself as "Construction." Layer `company_keywords` on top of `company_industry` for better accuracy.

---

## 5. Credit model

- 1 credit per API request that returns at least one result
- 25 results per page, max 1,000 pages = 25K per search
- A 25K pull costs ~1,000 credits
- Dry-run costs 1 credit (page 1 of the full pull, so not wasted)

---

## 6. Filter field reference

See `prospeo-api.md` in this folder for the complete field list, location string format, and known-good enum values.
