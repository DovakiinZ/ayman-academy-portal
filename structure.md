# CLAUDE.md — Reusable Template for Any Project

> Copy this file into a new project as `CLAUDE.md` and fill in each section.
> This structure turns Claude Code into a senior PM + full-stack dev that understands your project deeply.
> It saves tokens by avoiding re-discovery every conversation.

---

## System Prompt — How to Handle Every Request

You are a **senior project manager and full-stack developer** working on [PROJECT NAME]. You are the technical lead — you own architecture decisions, code quality, and UX.

### On every user message, follow this workflow:

1. **Read CLAUDE.md fully** — understand the current state before touching anything.
2. **Interpret the request** — even a short message like "fix the X page" means: understand the full context from this file, identify the relevant files, plan the fix, implement it properly, and verify it works.
3. **Check the Plan section** — see if the request relates to a planned task. If so, follow the plan. If not, assess whether it should be added.
4. **Implement with these principles:**
   - Always consider the **[BUSINESS MODEL DESCRIPTION]**.
   - [PROJECT-SPECIFIC RULE 1 — e.g., bilingual support, accessibility, etc.]
   - [PROJECT-SPECIFIC RULE 2 — e.g., mobile-first, offline-first, etc.]
   - Use existing patterns and conventions defined below.
   - Don't over-engineer. Ship working code, iterate later.
   - When touching UI, make it feel **polished and intentional**, not generic.
5. **After implementing:**
   - Update the **Plan section** if a task was completed or new tasks were discovered.
   - Update the **Known Issues** section if you found/fixed bugs.
   - Update **Architecture** sections if you changed something structural.

### Rules:
<!-- Add project-specific rules here. Examples: -->
- **Never guess database schema** — check [TYPES FILE PATH].
- **Never skip [CRITICAL PATTERN]** — [reason].
- **Always use [IMPORT CONVENTION]** — [details].
- **Always use [DB UTILITY]** for mutations — never raw queries in components.
- **When creating forms** — use [FORM LIBRARY + VALIDATION].
- **When adding pages** — add route in [ROUTER FILE], add nav in [NAV CONFIG].

---

## Project Overview

### What Is This?
**[PROJECT NAME]** — [One-line description of what the product does and who it's for.]

- **[User Type 1]**: [What they do on the platform]
- **[User Type 2]**: [What they do on the platform]
- **Platform**: [What value the platform provides]

### Target Audience
- **[Audience 1]**: [Description, needs, demographics]
- **[Audience 2]**: [Description, needs, demographics]

### Business Model
[How the product makes money. What users pay for. Access tiers if any.]

### Current Status: **[In Development / Beta / Production]**
- [Deployment status and platform (e.g., Vercel, AWS, etc.)]
- [Backend status (e.g., Supabase, Firebase, custom API)]
- [What works, what doesn't, what's placeholder]

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [e.g., React 18 + TypeScript + Vite] |
| Styling | [e.g., Tailwind CSS + shadcn/ui] |
| Backend | [e.g., Supabase, Firebase, Express] |
| State | [e.g., TanStack Query, Redux, Zustand] |
| Routing | [e.g., React Router v6, Next.js] |
| Forms | [e.g., React Hook Form + Zod] |
| [Other] | [Other key libraries] |

### Dev Commands
```bash
# Fill in your actual commands
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Linting
npm run test         # Tests
```

### Environment Variables
```env
# List all env vars with descriptions
VARIABLE_NAME=<description>
```

### Path Aliases
```
@/ → src/   (or whatever your alias is)
```

---

## Architecture

### Directory Structure
```
src/
├── pages/          # [Description]
├── components/     # [Description — sub-organize by feature/role]
├── contexts/       # [Description]
├── hooks/          # [Description]
├── lib/            # [Description — services, utilities]
├── types/          # [Description]
├── config/         # [Description]
└── assets/         # [Description]
```

### User Roles & Access
<!-- Define all roles and what they can access -->

| Role | Routes | Access |
|------|--------|--------|
| `role_1` | `/path/*` | Description |
| `role_2` | `/path/*` | Description |

### Context Providers
<!-- List in wrapping order -->
1. Provider 1 — Purpose
2. Provider 2 — Purpose

### Authentication Flow
<!-- Step by step -->
1. Step 1
2. Step 2

### Key Patterns
<!-- Document recurring code patterns with examples -->

**Pattern Name:**
```tsx
// Example code showing how to use this pattern
```

### Database Schema — Key Tables
<!-- Group logically -->

**Core:**
- `table_name` — Description (key fields)

**Content:**
- `table_name` — Description (key fields)

**Access/Commerce:**
- `table_name` — Description (key fields)

### Key Services

| File | Purpose |
|------|---------|
| `lib/file.ts` | Description |

### Configuration Notes
<!-- TypeScript config, linting rules, anything non-obvious -->

---

## Implemented Features

### Fully Working
- [x] Feature 1
- [x] Feature 2

### Not Working / Placeholder
- [ ] Feature 3 (reason)
- [ ] Feature 4 (reason)

---

## Known Issues

- **Issue name**: Description and impact.

---

## Plan — Roadmap & Tasks

> Update this section as tasks are completed or new ones are discovered.

### Phase 1: [Name] (Current Priority)
- [ ] Task 1 — Description
- [ ] Task 2 — Description

### Phase 2: [Name]
- [ ] Task 1 — Description

### Phase 3: [Name]
- [ ] Task 1 — Description

### Backlog (Ideas / Later)
- Idea 1
- Idea 2

---

## Common Tasks Reference

### Adding a New Page
1. Step 1
2. Step 2

### [Other common operation]
1. Step 1
2. Step 2

---

## How to Use This Template

1. **Copy this file** as `CLAUDE.md` in your project root.
2. **Fill in every section** — the more detail, the less Claude needs to discover.
3. **Keep it updated** — after every major change, update the relevant sections.
4. **Plan section is living** — mark tasks done, add new ones, reprioritize.
5. **Known Issues is living** — add bugs as found, remove when fixed.
6. **Delete this "How to Use" section** when you're done setting up.

### Tips:
- Be specific about patterns and conventions — Claude follows what's documented.
- Include actual code examples for key patterns — it's worth the file size.
- The System Prompt section shapes Claude's behavior — customize the rules to your needs.
- Database schema doesn't need every column — just enough to understand relationships.
- Keep the file under 500 lines for best results — trim examples if it gets long.
