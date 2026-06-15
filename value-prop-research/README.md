# Value Prop Research Skill for Claude Code

A Claude Code skill that mines Reddit and review sites (G2, Capterra) to find the exact language your ICP uses to describe their problems -- then turns it into a structured brief you can hand straight to a copywriter.

Built by [Litehouse](https://litehouse.so). Based on the Existential Data Point (EDP) framework by Jordan Crawford at Cannonball GTM.

---

## What it does

1. Takes your ICP and offer category as input
2. Identifies the right subreddits and review site categories to mine
3. Pulls live Reddit posts and comments via MCP (no API key needed)
4. Runs G2/Capterra searches for review language
5. Finds the single existential metric your ICP is measured on (the EDP)
6. Outputs a structured brief: 4-6 pain points with real quotes, PVP tests, and outbound angles

The output is ready to use as a brief before writing cold email copy.

---

## Setup

### 1. Install uv

```bash
pip install uv
```

Or see [docs.astral.sh/uv](https://docs.astral.sh/uv) for other install methods.

### 2. Add the Reddit MCP to your project

Create a `.mcp.json` file in your project root (or add to existing):

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

No API key or Reddit account needed. The MCP server ([Hawstein/mcp-server-reddit](https://github.com/Hawstein/mcp-server-reddit)) reads public Reddit data anonymously.

### 3. Add the skill to your project

Copy the `SKILL.md` file into your project at `.claude/skills/value-prop-research/SKILL.md`.

### 4. Verify it's working

Open Claude Code and run `/mcp` -- you should see `reddit` listed as a connected server.

---

## Usage

Type `/value-prop-research` in Claude Code, or just describe what you're trying to research. The skill will prompt you for your ICP and offer category, then run the research.

---

## Credits

- EDP framework and Permissionless Value Prop concept: Jordan Crawford, [Cannonball GTM](https://cannonballgtm.substack.com)
- Reddit MCP server: [Hawstein/mcp-server-reddit](https://github.com/Hawstein/mcp-server-reddit)
