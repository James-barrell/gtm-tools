# list-build Claude Skill

A Claude Code skill that turns a plain-English targeting brief into a qualified B2B lead list CSV. You tell it who you want to target, it figures out the Prospeo filter spec, runs the search, and hands you a CSV. You never need to open Prospeo.

Works alongside the `prospeo-list-builder` CLI in this repo.

## Install

One-line install that drops the skill into your Claude Code project:

```bash
curl -fsSL https://raw.githubusercontent.com/Litehouse-gtm/gtm-tools/main/list-build-skill/install.sh | bash
```

Or manually copy `SKILL.md` to `.claude/skills/list-build/SKILL.md` in your Claude Code project.

## Prerequisites

- Claude Code installed (claude.ai/code)
- The `prospeo-list-builder` CLI set up in your project (see `../prospeo-list-builder/`)

## Usage

In Claude Code, type:

```
/list-build
```

Claude will ask you a few questions:
- What job titles are you targeting?
- What industry?
- What headcount range?
- What location?
- Anything to exclude?

Then it proposes a filter spec, runs a dry-run to show you the result count and credit cost, waits for your confirmation, and pulls the full CSV.

## Example input

```
Targeting VP of Sales and Head of Sales at B2B SaaS companies,
50-500 employees, United States. Exclude interns and assistants.
```

## What you get

A CSV in `prospeo-list-builder/outputs/` with name, title, LinkedIn URL, company, domain, industry, headcount, and location. Ready for Clay enrichment or direct upload to your sending tool.

## Files

- `SKILL.md` — the skill instruction file Claude reads
- `prospeo-api.md` — Prospeo API field reference and known-good enum values
- `filter-recipes.md` — library of proven filter patterns by industry
