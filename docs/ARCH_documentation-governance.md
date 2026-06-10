# ARCH_documentation-governance — Registry & Loading Guide

---

## Registry & Loading Guide

> **If a file is not here, register it before using it.**

| File | Contains | Must NOT contain | Load when |
|------|----------|-----------------|-----------|
| `AGENTS.md` | Session-critical rules, quick-reference, project metadata | Detailed implementation, full doc content | **Always** |
| `GUIDE_developer.md` | Implementation standards, naming rules, patterns, versioning, pre-commit | Feature-specific logic, data structures | Technical work |
| `ARCH_documentation-governance.md` | System's source of truth for doc management | Implementation content | Managing docs |
| `ARCH_technical-specs.md` | Core architecture, data models, state flows, system boundaries | Formatting rules, UI tokens | Structural work |
| `STANDARDS_interface.md` | Output formats, API specs, visual/CLI standards, IO rules | Business logic, algorithms | Interface/IO work |
| `REF_developer-reference.md` | Naming examples, lookup tables, layout tables, reference data | Implementation content | Checking conventions / lookup |
| `REF_template.md` | Blank template for creating new doc files | Rules, implementation content | Creating a new doc file |
| `REFACTOR_TODO.md` | Current refactor work plan and targets | Canonical rules | Refactor planning |
| `LOGIC_query-parsing.md` | Natural language query parsing rules and regex mappings | Implementation standards | Technical work |
| `LOGIC_caching.md` | Cache manager configuration, LRU scores, and eviction logic | Implementation standards | Technical work |
| `LOGIC_tools.md` | MCP tools registration, parameters, parallel batching, and converter rules | Implementation standards | Technical work |


### Task → Load mapping

| Task | Load |
|------|------|
| General development | `AGENTS.md` |
| Feature / Logic changes | `AGENTS.md` + `GUIDE_developer.md` + relevant `LOGIC_*.md` |
| Implementation / Standards | + relevant `GUIDE_*.md` |
| Architecture / Data changes | + relevant `ARCH_*.md` |
| Interface / Output changes | + relevant `STANDARDS_*.md` |
| Reference lookup | + relevant `REF_*.md` |
| Refactor planning | `REFACTOR_TODO.md` |
| Documentation management | `ARCH_documentation-governance.md` |
| Reviewing past failures | + relevant `INCIDENT_*.md` |

---

## Canonical Ownership

Use one file as the source of truth for each rule group.

| Area | Canonical file |
|------|----------------|
| Session-critical rules | `AGENTS.md` |
| Implementation standards | `GUIDE_developer.md` |
| Docs registry / load mapping | `ARCH_documentation-governance.md` |
| Project-specific logic | `LOGIC_*.md` |

---

## Docs Naming Convention

| Prefix | Scope |
|--------|-------|
| `GUIDE_` | Implementation rules and standards |
| `ARCH_` | System architecture, data flow, structure |
| `LOGIC_` | Feature behavior, algorithms, business rules |
| `STANDARDS_` | Interface specs, output formats, visuals |
| `REF_` | Reference tables, constants, lookup data |
| `INCIDENT_` | Incident post-mortems, regression logs |

**Fixed names (no prefix, must not rename):** `AGENTS.md`

**Fallback rule:** If a file is not in the registry → read prefix → load only if task matches → flag to user that registry needs updating.

---

## Maintenance Rules

**One rule above all: content exists in ONE file only. No duplication.**
**Compact, not incomplete: remove empty sections, never remove rules, edge cases, or reference rows.**

### Adding a new doc
1. Pick prefix from naming convention table.
2. Register in the Registry table above (mandatory).

### Moving content
1. Copy to destination → verify complete → delete from source → update any references.

### Editing existing files
- `AGENTS.md`: session-critical rules and metadata only.
- `GUIDE_*`: coding standards + basic UI. No deep visual rules.
- `STANDARDS_*`: visual/interaction only. No coding standards.
- Registry table: update immediately when any file is added, renamed, or removed.

---

*v1.0.0 — 2026-06-10*
