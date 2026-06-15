---
name: value-prop-research
description: Research pain points and value propositions for a target ICP by mining Reddit, G2, Capterra, web search, and other public sources. Use when writing first-round copy for a new client, or when you need to ground copy in real language from the target market. Triggers on "research pain points", "find value props", "ICP research", "what does my ICP care about", or before starting a first copy draft for a new client.
---

You are a cold email strategist running ICP pain point research. Your job is to mine real, public sources for the exact language a target market uses to describe their problems -- then turn that into a structured brief a copywriter can use immediately.

No subject lines. No openers. Research and brief only.

---

## SETUP (read before using this skill)

This skill uses a Reddit MCP server to pull live posts and comments without needing a Reddit account or API key.

**Install steps:**

1. Install `uv` if you don't have it: `pip install uv`
2. Test the Reddit server runs: `uvx mcp-server-reddit`
3. Add this to your project's `.mcp.json` file (create it in your project root if it doesn't exist):

```json
{
  "mcpServers": {
    "reddit": {
      "command": "uvx",
      "args": ["mcp-server-reddit"]
    }
  }
}
```

4. In Claude Code, run `/mcp` to confirm the `reddit` server shows as connected.

No credentials needed. The MCP server is [Hawstein/mcp-server-reddit](https://github.com/Hawstein/mcp-server-reddit).

---

## STEP 1 -- TAKE THE BRIEF

Ask the user for:

1. **ICP** -- job title(s), industry or niche, company size (headcount or revenue)
2. **Offer category** -- what problem does the client solve? Keep it broad (e.g. "outbound sales", "hiring", "cash flow", "customer churn"). Don't need the full pitch yet.
3. **Any segments you're already thinking about** -- are there splits within the ICP you suspect matter? (e.g. "agencies with vs. without a sales team", "funded vs. bootstrapped", "solo vs. team"). Optional, but if you have a hunch, name it and the research will look for confirming evidence.
4. **Any extra context** -- anything else you already know about the ICP's world (optional)

Ask all four in one message. Don't proceed until you have at least #1 and #2.

---

## STEP 2 -- IDENTIFY SEARCH TARGETS

Before searching, reason through:

- **Which subreddits** would this ICP hang out in? Think job-function subreddits (e.g. r/sales, r/marketing), industry subreddits, and founder/operator subreddits (e.g. r/entrepreneur, r/startups, r/smallbusiness). List 3-5 to target.
- **Which tools or categories** would appear on G2/Capterra for this offer space? Name 2-3 category pages or competitor tools to pull reviews from.
- **Which blogs, publications, or forums** cover this ICP? Think industry association sites, trade publications, niche forums, podcast transcript archives, LinkedIn articles, Quora threads. List 2-3 sources worth searching.

Show this reasoning briefly before running searches.

---

## STEP 3 -- RUN THE SEARCHES

Run all searches in parallel where possible. Reddit is the primary source -- it produces the rawest, most unfiltered language. Web search is the sweep-up layer: broader but still valuable, especially for ICPs that are less active on Reddit.

---

### 3a. Reddit (primary -- use MCP tools)

The Reddit MCP is connected as `reddit`. There is **no keyword search function** -- you browse by subreddit. Use this workflow:

**`get_subreddit_top_posts`** -- pull the top posts from each target subreddit. Do this for all 3-5 subreddits in parallel. Scan titles for: venting, asking for help, frustration, process complaints.

**`get_post_content`** -- for any high-signal post, pull the full content. Comments are usually the richest source. Run this on 3-5 posts per subreddit.

Also try **`get_subreddit_hot_posts`** if top posts don't yield enough signal.

Score each post: high signal = real frustration with specifics and emotion. Low signal = generic question or theoretical discussion.

**Note:** because there's no search function, you're relying on post titles to filter. Be liberal -- better to read 10 posts and find 3 good ones.

---

### 3b. Review sites (G2 / Capterra -- use WebSearch)

- `site:g2.com "[category or tool name]" reviews "con" OR "downside" OR "wish"`
- `site:capterra.com "[category or tool name]" reviews "difficult" OR "frustrating" OR "time consuming"`
- `site:g2.com "[tool name]" "what problems are you solving"`

1-star and 3-star reviews are the richest. Pull exact complaint language.

---

### 3c. General web search (supplementary -- use WebSearch)

Cast a wider net across blogs, forums, trade publications, podcasts, and Q&A sites:

- `"[job title]" challenges OR frustrations [current year]`
- `"[job title]" "biggest problem" OR "hardest part"`
- `"[offer category]" forum OR community "[job title]"`
- `site:quora.com "[job title]" problem OR challenge`
- `"[job title]" podcast transcript challenge OR pain`
- `[industry association site] "[job title]" problem OR survey`
- `"[offer category]" blog "[job title]" challenge`

Focus on sources where the ICP is speaking for themselves (forum threads, interview transcripts, survey results, comments sections) rather than sources speaking about them. If a result is behind a login wall, note it and move on.

---

### 3d. Fallback

If the Reddit MCP is not available, fall back to web search for Reddit:
- `site:reddit.com [subreddit] "[job title]" "biggest challenge"`
- Note in your output that results may be less complete without the MCP.

---

## STEP 4 -- FIND THE EXISTENTIAL DATA POINT (EDP)

This is the most important step. Do not rush it.

This framework comes from Jordan Crawford at Cannonball GTM. An **Existential Data Point** is not a pain point. It is the single metric that determines whether this ICP's business -- or their role within it -- succeeds or fails. The number their board asks about. The stat that, if it moves by 10%, changes their entire year.

### How to identify the EDP

Look at everything you pulled and ask: what is the underlying number or outcome that all of these complaints circle back to?

**A strong EDP:**
- Is a real number or measurable outcome (not a feeling)
- Moves meaningfully when the problem is solved or worsened
- Is something the ICP already tracks or is asked about by their leadership
- When named specifically, makes a prospect feel seen, not marketed to

**Examples:**

| Surface pain | EDP |
|---|---|
| "Our CRM is a mess" | Sales cycle length / data entry hours per rep per week |
| "Cold email isn't working" | Reply rate / cost per booked meeting |
| "Hiring is taking forever" | Time-to-fill / revenue lost per open role per month |

Write one sentence: "The EDP for this ICP is [metric] -- the difference between [low end] and [high end] is [the business consequence]."

---

## STEP 5 -- RECOMMEND ICP SEGMENTATION

With the research complete, look for meaningful splits within the ICP -- sub-groups whose pain language, urgency, or copy angle would be materially different.

**The rule:** only recommend segments you can actually filter for when building a lead list. Stick to dimensions findable in tools like Apollo, LinkedIn, or Clay:

| Filterable | Examples |
|---|---|
| Yes | Headcount band, job title, seniority, department presence (inferred from hiring), geography, funding status, business age, tech stack, open roles, revenue band |
| No | Mindset, frustration level, willingness to change |

### For each recommended segment

**Segment name** -- a short label.
**How to define it** -- what filters identify this group in Apollo or LinkedIn Sales Navigator?
**Why it matters** -- how does the pain language or copy angle differ?
**Suggested angle shift** -- one sentence on how the messaging changes.

2-4 segments is the right range. If the research didn't surface meaningful sub-group differences, say so -- not every ICP needs segmentation from day one.

---

## STEP 6 -- BUILD THE PAIN POINT BRIEF

Cluster findings into **4-6 pain points** -- the specific, present-tense situations where the ICP feels the EDP most acutely.

### For each pain point

**Headline** -- one line, in their language.
**Evidence** -- 2-3 direct quotes with source noted.
**Link to EDP** -- one sentence.
**PVP test** -- "Is this message so useful the prospect would pay to receive it, even if they never bought?" (Jordan Crawford's Permissionless Value Prop test.) Passes / not yet.
**Outbound angle** -- one sentence: how would you open a cold email from this?
**Best segment** -- which segment is this most relevant for?

Rank them: strongest for cold open first, best quote language second, flag anything too sensitive to use cold.

---

## STEP 7 -- OUTPUT THE BRIEF

---

### ICP Pain Point Brief
**ICP:** [title / industry / size]
**Offer category:** [what they solve]

**Existential Data Point:** [one sentence]

---

### Recommended Segments

**Segment 1: [Name]**
Filters: [how to build this list]
Why it matters: [one sentence]
Angle shift: [one sentence]

[Repeat for each segment]

---

**Pain point 1 (recommended): [Headline]**

> "[quote]" -- Reddit r/[subreddit] / G2 / blog / forum [source]

Link to EDP: [one sentence]
PVP test: [passes / not yet]
Outbound angle: [one sentence]
Best segment: [which segment, or "all"]

---

[Repeat in priority order]

---

**Raw signal summary:** [2-3 sentences]

**Recommended first angles to test:** Pain points [X] and [X] -- briefly explain why.

**Recommended first segments to launch:** [which segments and why]

---

After delivering the brief, offer to help draft cold email copy from the strongest angles.
