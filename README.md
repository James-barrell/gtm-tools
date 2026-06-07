# Litehouse GTM Tools

Open-source tools we use at [Litehouse](https://litehouse.so) to run cold outbound. CLIs, Claude Code skills, and reference docs. Free to use and adapt.

---

## Tools

### [prospeo-list-builder](./prospeo-list-builder/)

CLI for building B2B lead lists via the Prospeo people search API. Takes a JSON filter spec, handles pagination, rate limiting, deduplication, and automatic state-splitting for large US searches. Outputs a clean CSV ready for Clay or your sending tool.

```bash
npm run search -- --spec filters/my-search.json --out outputs/leads.csv --confirm
```

### [list-build-skill](./list-build-skill/)

Claude Code skill that wraps the Prospeo CLI. Type `/list-build` in Claude Code, answer a few plain-English questions about who you want to target, and it builds and runs the search for you.

```bash
curl -fsSL https://raw.githubusercontent.com/Litehouse-gtm/gtm-tools/main/list-build-skill/install.sh | bash
```

---

## Setup

Each tool has its own README with setup instructions. Start with `prospeo-list-builder` since the skill depends on it.

---

## More coming

We add new tools as we build them. Watch the repo or follow along at [litehouse.so](https://litehouse.so).

---

MIT License
