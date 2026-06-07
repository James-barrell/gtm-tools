#!/usr/bin/env bash
set -e

SKILL_DIR=".claude/skills/list-build"
BASE_URL="https://raw.githubusercontent.com/Litehouse-gtm/gtm-tools/main/list-build-skill"

echo "Installing list-build skill..."

mkdir -p "$SKILL_DIR/references"

curl -fsSL "$BASE_URL/SKILL.md" -o "$SKILL_DIR/SKILL.md"
curl -fsSL "$BASE_URL/prospeo-api.md" -o "$SKILL_DIR/references/prospeo-api.md"
curl -fsSL "$BASE_URL/filter-recipes.md" -o "$SKILL_DIR/references/filter-recipes.md"

echo ""
echo "Done. Skill installed to $SKILL_DIR"
echo ""
echo "Next: make sure prospeo-list-builder is set up in your project."
echo "See https://github.com/Litehouse-gtm/gtm-tools/tree/main/prospeo-list-builder"
echo ""
echo "Then open Claude Code and type: /list-build"
