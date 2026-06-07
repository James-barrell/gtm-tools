# Filter Recipes

Library of proven Prospeo filter sets by ICP. Grow this over time. When a filter spec works well for a segment, add it here with notes on what it was for, what the results looked like, and any tweaks that helped.

Each recipe is a starting point, not a finished spec. Always adjust for the specific client and segment before running.

---

## How to use

Copy a recipe, paste it into `projects/prospeo-list-builder/filters/{client}-{segment}-{date}.json`, rename the `name` field, tweak the titles/industries/keywords to match the client, and run.

---

## Recipes

### B2B SaaS with sales teams (US, mid-market)

For targeting SaaS companies that have dedicated sales functions. Use for cold email agency outreach, sales tooling outreach, GTM services.

```json
{
  "name": "saas-with-sales-mid-market-us",
  "description": "B2B SaaS 20-500 headcount, US, CEO / Founder / sales leadership, verified emails",
  "notes": "Use company_keywords instead of company_industry to avoid enum mismatch. Add specific industry exclusions via keywords when needed.",
  "filters": {
    "person_job_title": {
      "include": [
        "CEO",
        "Founder",
        "Co-Founder",
        "Chief Revenue Officer",
        "VP Sales",
        "Head of Sales",
        "Sales Director",
        "Director of Sales",
        "Head of Growth",
        "VP Business Development",
        "Head of Business Development"
      ],
      "exclude": ["Assistant", "Intern", "Associate"],
      "match_only_exact_job_titles": false
    },
    "company_keywords": {
      "include": ["saas", "b2b"],
      "exclude": ["cybersecurity", "crypto", "devtools", "blockchain"],
      "include_all": false
    },
    "company_headcount_custom": { "min": 20, "max": 500 },
    "person_location_search": { "include": ["United States #US"] },
    "person_contact_details": { "email": ["VERIFIED"] }
  }
}
```

---

### Manufacturing with sales teams (US)

For outbound into traditional manufacturing. Lean on "Commercial Director" and "National Sales Manager" since these are the traditional org titles.

```json
{
  "name": "manufacturing-with-sales-us",
  "description": "Manufacturing companies with sales teams, US, owner / commercial / sales leadership",
  "notes": "Traditional manufacturing uses Commercial Director and Sales Manager titles more than VP Sales. Exclude staffing/supply via keywords.",
  "filters": {
    "person_job_title": {
      "include": [
        "CEO",
        "President",
        "Owner",
        "Founder",
        "Commercial Director",
        "VP Sales",
        "Sales Director",
        "National Sales Manager",
        "Head of Sales",
        "Director of Sales",
        "VP Business Development"
      ],
      "exclude": ["Assistant", "Intern"],
      "match_only_exact_job_titles": false
    },
    "company_keywords": {
      "include": ["manufacturing", "manufacturer"],
      "exclude": ["staffing", "recruiting", "supply store", "wholesale supply"],
      "include_all": false
    },
    "company_headcount_custom": { "min": 20, "max": 500 },
    "person_location_search": { "include": ["United States #US"] },
    "person_contact_details": { "email": ["VERIFIED"] }
  }
}
```

---

### Marketing agencies / consultancies with sales teams (US)

For targeting agencies. "Head of New Business" is the gold title, it's basically the agency equivalent of VP Sales.

```json
{
  "name": "marketing-agencies-with-sales-us",
  "description": "Marketing agencies / consultancies 10-200 headcount, US, founder / new business leadership",
  "notes": "Agencies use 'New Business Director' and 'Head of New Business' as the sales leadership title. Exclude recruiting, staffing, PR-only shops. Agencies are the hardest segment to sell to because they know the playbook, so the copy needs to lean hard on specific numbers or capacity framing.",
  "filters": {
    "person_job_title": {
      "include": [
        "CEO",
        "Founder",
        "Co-Founder",
        "Managing Director",
        "Managing Partner",
        "Partner",
        "Head of New Business",
        "New Business Director",
        "Director of New Business",
        "Business Development Director",
        "Head of Business Development",
        "Head of Growth"
      ],
      "exclude": ["Assistant", "Intern", "Freelance"],
      "match_only_exact_job_titles": false
    },
    "company_keywords": {
      "include": ["agency", "marketing", "consultancy"],
      "exclude": ["recruiting", "staffing", "headhunting", "real estate", "law firm"],
      "include_all": false
    },
    "company_headcount_custom": { "min": 10, "max": 200 },
    "person_location_search": { "include": ["United States #US"] },
    "person_contact_details": { "email": ["VERIFIED"] }
  }
}
```

---

### Finance with sales teams (US)

For fintech and advisory/wealth/accounting firms. Different sub-buckets have different best titles. Consider building two specs: one for fintech (VP Sales, Growth), one for services (Partner, Managing Partner, BD).

```json
{
  "name": "finance-with-sales-us",
  "description": "Finance companies with sales teams, US, 10-500 headcount, partner / sales / BD leadership",
  "notes": "Finance is broad. Split into fintech vs advisory/services for best results. Exclude retail banking, credit unions, asset managers. Partner titles dominate in services firms.",
  "filters": {
    "person_job_title": {
      "include": [
        "CEO",
        "Founder",
        "Managing Partner",
        "Managing Director",
        "Partner",
        "President",
        "Chief Revenue Officer",
        "VP Sales",
        "Head of Sales",
        "Sales Director",
        "Head of Business Development",
        "VP Business Development",
        "Director of Business Development"
      ],
      "exclude": ["Assistant", "Intern", "Analyst"],
      "match_only_exact_job_titles": false
    },
    "company_keywords": {
      "include": ["finance", "financial services", "fintech", "advisory", "wealth management"],
      "exclude": ["retail bank", "credit union", "asset management", "trading firm"],
      "include_all": false
    },
    "company_headcount_custom": { "min": 10, "max": 500 },
    "person_location_search": { "include": ["United States #US"] },
    "person_contact_details": { "email": ["VERIFIED"] }
  }
}
```

---

## Adding new recipes

When a spec proves out (good reply rates, right kind of prospects), add it here with:

- `###` heading naming the ICP
- Short description of what it's for
- Notes on any gotchas, exclusions that mattered, or tweaks that helped
- The full JSON spec

Keep the notes specific. "Exclude staffing because plumbers pulled in staffing agencies that serve plumbers" is more useful than "add exclusions."
