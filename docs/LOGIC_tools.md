# LOGIC_tools — MCP Tools and API Integration

> **Compact, not incomplete.** Remove sections with no content. Never remove rules, edge cases, or reference rows to save space.

---

## Rules
> Hard constraints. AI must follow unconditionally.

| Rule | Detail |
|------|--------|
| Parallel Batching | Batch requests for cocktail details must run in parallel chunks of size 5 to 10 requests to optimize performance |
| Error Isolation | Failure of a single recipe request during a batch lookup must fall back to cached or minimal template data instead of failing the entire operation |
| Volume Conversion | All volume amounts in milliliters (`ml`) must be dynamically converted to ounces (`oz`) rounded to the nearest `0.25oz` |

---

## Reference
> Lookup tables. No prose.

### MCP Tools List

| Tool Name | Key Arguments | Purpose |
|-----------|---------------|---------|
| `smart_search_cocktails` | `query`, `similar_to`, `ingredient`, `must_include[]`, `limit` | Performs advanced cocktail searches using natural language parsing and similarity mappings |
| `get_recipe` | `cocktail_id`, `cocktail_name`, `cocktail_ids[]`, `cocktail_names[]`, `include_variations` | Retrieves full recipe details for single or batch cocktail lookups |
| `get_ingredient_info` | `ingredient_name` | Queries ingredient definitions, usage, and replacement suggestions |

### Volume Formatting Conversions

| ML Value | Rounded Oz Equivalent | Calculation |
|----------|-----------------------|-------------|
| `< 29.57` | Rounded to decimal oz | `value / 29.5735` |
| `>= 29.57` | Rounded to nearest 0.25oz | `Math.round((value / 29.5735) * 4) / 4` |

---

## Edge Cases
> Only document cases that are non-obvious or have caused bugs.

- **Similarity Search Fallback**: If a similarity search by name returns no matches, the system falls back to a standard query search.
- **Unavailable Recipe Details**: In case the API query for a cocktail ID fails and search-fallback fails, a mock/fallback structure with "Recipe details unavailable" is used.

---

*v1.0.0 — 2026-06-10*
