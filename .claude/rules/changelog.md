# Changelog Rule — MANDATORY

🔴 CRITICAL: ALWAYS UPDATE CHANGELOG.md AFTER ANY CODE CHANGE

## When to Update

After ANY of these:

- Bug fixes (FIX:)
- New features (FEATURE:)
- Refactoring (REFACTOR:)
- Maintenance tasks (CHORE:)

## How to Update

1. Open CHANGELOG.md in project root
2. Find or create today's date section: ## YYYY-MM-DD
3. Add entry at TOP of section
4. One line per change

## Format

## YYYY-MM-DD

FEATURE: Add authentication middleware
FIX: Resolve login redirect bug
REFACTOR: Simplify database service
CHORE: Update dependencies

## Rules

- One line per change
- Use present tense
- Add immediately after code change

## Mandatory workflow

1. Make code change
2. Run lint/typecheck
3. UPDATE CHANGELOG.md
4. Done

This rule is NON-NEGOTIABLE.