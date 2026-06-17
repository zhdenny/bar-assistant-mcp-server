# Agent — Bar Assistant MCP Server (v1.0.8) — 2026-06-16

> **Strict Rule**: Read this file at every session start.

## Project Setup
- **Project Name**: Bar Assistant MCP Server
- **Version**: 1.0.8 — use bump script only, never manually edit
- **Status**: Active
- **Tech Stack**: Node.js, TypeScript, Express, Axios, MCP SDK
- **Context Anchors**: None

## Documentation Priority
- `docs/` is the source of truth for behavior, architecture, and implementation rules.
- `AGENTS.md` holds only: session-critical rules, quick-reference checklists, metadata.
- Do not duplicate detailed explanations here — link to `docs/` instead.
- **Scope unclear?** Open `docs/ARCH_documentation-governance.md` first — task→load mapping is there.

## Documentation Governance
- **Implementation Standards**: `docs/GUIDE_developer.md` — how we write code, refactor, and test.
- **Architecture & Data**: `docs/ARCH_technical-specs.md` — data models, routing, system boundaries.
- **Visual & IO Standards**: `docs/STANDARDS_*.md` — design tokens, output formats, interface specs.
- **Rule**: Never consolidate these files without explicit intent. Keep concerns isolated to prevent accidental regressions.

## AI Technical Governance (CRITICAL)
- **Discussion Precedence (CRITICAL)**: **Strictly forbidden to create, modify, or delete any code/files until the plan is fully discussed and finalized with the user.**

## TDD Decision Rule
- **Use TDD** for: logic, data processing, routing, rendering output, business rules.
- **Skip TDD** for: docs, copy, rename, formatting, cosmetic edits.

## Goal-Driven Execution
Verify → trace → build → confirm. Never guess → build → fix → repeat.
Before multi-step tasks, state a brief plan: `[Step] → verify: [check]`.

## Response Style (CRITICAL)
- Answer only what's asked. No intro, recap, outro, filler, or padding.
- Markdown only when it helps (tables, code blocks).
- Unsure → ask **one** question. No assumptions.

### Writing Rules
Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.

Pattern: `[thing] [action] [reason]. [next step].`

- ❌ "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
- ✅ "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"
- "Why React component re-render?" → "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."
- "Explain database connection pooling." → "Pool reuse open DB connections. No new connection per request. Skip handshake overhead."

### Auto-Clarity
Revert to full sentences for: security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread. Resume terse after.

### Boundaries
Code blocks, commit messages, PR descriptions: write normal always.

## Common Mistakes
| Mistake | Prevention |
|---------|------------|
| Refactoring working code without being asked | Only refactor on explicit request |
| Adding work to an existing changelog entry | New task = new version header always |
| Duplicating a rule across multiple files | One file owns each rule — link, don't copy |
| Manual version bumps | Always use the bump script |
| Assuming without confirming | If unsure, ask one question |
| Changing unrelated files in the same edit | One edit = one concern |
| Skipping the registry when adding a doc | Register before use, always |

## Pre-Commit Protocol
1. **Test**: Run full test suite. All tests must pass.
2. **Bump**: Use bump script — never manually edit version numbers.
3. **Docs**: Add notes to new version header only. Never insert into old entries.
4. **Build**: Confirm production build passes.
5. **Clean**: Remove debug statements, fix TODOs, delete scratch files.
6. **Git**: No `push` or `commit` without explicit user approval per action.

## Milestones
- [ ] v1.0.0: Initialize project living docs

## Commands
- `[dev command]`: npm run dev
- `[test command]`: npm test
- `[build command]`: npm run build
- `[bump command]`: npm version

## Project Notes
> Add project-specific state, quick-reference data, or active constraints here (e.g., board status, feature flags, intentional quirks).

---

*v1.0.8 — 2026-06-16*
- Added SSE active session authentication bypass to allow clients/proxies to omit credentials after handshake.
- Normalized incoming and server-side authentication tokens by stripping quotes and whitespace before comparison.
- Added TDD unit tests to verify active session authentication bypass and token quote normalization.

*v1.0.7 — 2026-06-13*
- Added support for getting and using cocktail images in any response.
- Implemented getBaseUrl() method on BarAssistantClient.
- Updated response schemas and output schemas to validate image_url.
- Added TDD unit test to verify image URL retrieval and schema validation.

*v1.0.6 — 2026-06-13*
- Added mandatory SSE token authentication using MCP_SSE_TOKEN environment variable.
- Supported token extraction from Authorization headers and URL query parameters (?token=...).
- Updated client mcp_config.json for agy integration verification.

*v1.0.5 — 2026-06-13*
- Integrated hybrid Streamable HTTP and Server-Sent Events (SSE) transports to support modern clients (e.g. agy).
- Documented hybrid architecture, lifecycle endpoints, and proxy buffering avoidance headers in ARCH_technical-specs.md.

*v1.0.4 — 2026-06-12*
- Added Docker deployment and connectivity integration tests to run-tests.ts.
- Added automatic custom environment loader for local development testing.

*v1.0.3 — 2026-06-11*
- Fixed missing express.json() and cors() middleware in SSE server connection.
- Changed Docker/docker-compose entrypoint to run node directly to avoid stdio pollution from npm start.

*v1.0.2 — 2026-06-11*
- Removed MCP_API_KEY authentication requirements, middleware, configuration, and references across code, tests, and documentation.

*v1.0.1 — 2026-06-11*
- Fixed: Allowed active SSE session IDs to bypass auth check on POST /message, resolving parameter-stripping connection errors.

*v1.0.0 — 2026-06-10*

