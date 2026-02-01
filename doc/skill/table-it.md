# Skill: Table It

When planning upcoming work or documenting decisions, use this structure:

## Structure

```
docs/
  upcoming.md              # Overview table linking to details
  skill/                   # Meta-instructions like this one
    table-it.md
  YYYY-MM-DD-HHMM-slug.md  # Detailed docs, <200 lines each
```

## Rules

1. **upcoming.md** contains a priority table with links
2. **Detail docs** use date-prefixed names: `2026-01-31-1645-semantic-sound-tokens.md`
3. **Each detail doc** should be <200 lines with concrete code blocks
4. **Link liberally** — upcoming.md links to details, details link to each other
5. **Code blocks** should be copy-pasteable, not pseudocode

## Template: upcoming.md

```markdown
# Upcoming

| Priority | Task | Status | Details |
|----------|------|--------|---------|
| 1 | Task name | ✅ Done | [link](./2026-01-31-1200-slug.md) |
| 2 | Task name | 🔜 Next | [link](./2026-01-31-1300-slug.md) |
| 3 | Task name | 📋 Planned | [link](./2026-01-31-1400-slug.md) |
```

## Template: Detail Doc

```markdown
# Title

Brief description (1-2 sentences).

## Problem

What we're solving.

## Solution

How we solve it.

## Implementation

\`\`\`typescript
// Concrete, copy-pasteable code
\`\`\`

## Files to Create/Modify

- `path/to/file.ts` — description

## Next Steps

- [ ] Checklist item
```

## Why This Works

- **Scannable**: Table gives overview at a glance
- **Deep-linkable**: Each topic has its own URL
- **Bounded**: <200 lines forces focus
- **Actionable**: Code blocks are real, not hand-wavy
