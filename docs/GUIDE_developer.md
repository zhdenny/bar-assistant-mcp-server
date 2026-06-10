# GUIDE_developer — Implementation rules for Bar Assistant MCP Server

---

## Rules

> Hard constraints. AI must follow unconditionally. Add project-specific rules here.

| Rule | Detail |
|------|--------|
| No unsolicited refactor | Never refactor working code unless explicitly asked |
| Git operations | No push or commit without explicit user approval |
| TDD | Write or update tests before implementation for anything affecting data, routing, rendering, or business logic |
| [project rule] | [what it means in practice] |

---

## Refactoring Standards

| Rule | Detail |
|------|--------|
| No unsolicited refactor | Never refactor working code unless explicitly asked — even if it violates standards above |

### When to Extract a Function

| Trigger | Action |
|---------|--------|
| Logic or template appears **2+ times** | Extract immediately — no exceptions |
| Function body exceeds **20 lines** | Extract inner logic into named helpers |
| Inline expression requires a comment to understand | Extract into a named function instead |
| Template string contains repeated HTML structure | Extract into a builder function |


### When to Split a File

| Trigger | Action |
|---------|--------|
| File exceeds **200 lines** | Review — split if multiple responsibilities |
| File exceeds **400 lines** | Split mandatory — one responsibility per file |
| File contains 2+ unrelated concept groups | Split regardless of line count |
| A function is reused across 2+ files | Move to a shared helper file |

### Module Structure Rules

| Rule | Detail |
|------|--------|
| One responsibility per file | A file does one thing: builds one section, processes one data type, or holds one group of helpers |
| Orchestrators stay thin | Entry-point files contain only: data calls, cache logic, output rendering, event binding |
| Helpers are stateless | Helper functions must be pure — no side effects, no global reads |
| Shared helpers live in one place | If 2+ files need the same helper, extract to a shared `*-helpers` file — never duplicated |
| Import direction is one-way | Helpers never import from orchestrators. Processors never import from renderers |

### Zero-Loss Refactor Protocol

Use for any file split, large refactor, or move:

1. **Audit** first
2. **Create targets** before removing old code
3. **Bridge** with re-exports or adapters
4. **Verify** with typecheck and tests
5. **Cut** only after behavior is stable
6. **Verify again** after cleanup

Do not skip the bridge phase for large moves. It is the main guardrail against broken imports and partial refactors.

Other docs should name this protocol, not duplicate its full steps.

### Anti-Patterns (Banned)

| Pattern | Why it fails | Fix |
|---------|-------------|-----|
| Logic duplicated across files | Conflicts when one is updated | Extract to shared helper |
| One file doing data + rendering + events | Violates SRP, hard to cache | Split into processor / renderer / controller |
| Importing a full module for one constant | Unnecessary coupling | Move constant to shared constants file |
| [project-specific pattern] | [why] | [fix] |

---

## Architectural Defaults

### State & Storage Registry
If the system maintains state (e.g., Cache, Environment Variables, Database Tables, LocalStorage, Memory pools), it must be explicitly registered in an `ARCH_` document.
- **Rule**: No ad-hoc or undocumented keys/variables. All global state identifiers must be centralized to prevent collision and ensure predictable cache invalidation.

### Namespace & Collision Governance
Define strict naming boundaries for shared resources to prevent collision.
- **Resource Namespaces**: Use prefixes for global resources (e.g., API routes `/api/v1/`, Env vars `APP_DB_*`, UI tokens `.ui-`).
- **Priority Layering**: If resources stack or conflict (e.g., execution order, system ports, visual Z-indexes), define an absolute hierarchy in the documentation.

---

## Reference

Reference tables: [REF_developer-reference.md](./REF_developer-reference.md).

---

## Edge Cases

- **[case]**: [what to do]

---

*v1.0.0 — 2026-06-10*
