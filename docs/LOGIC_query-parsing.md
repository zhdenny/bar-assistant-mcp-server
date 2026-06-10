# LOGIC_query-parsing — Natural Language Query Parser

> **Compact, not incomplete.** Remove sections with no content. Never remove rules, edge cases, or reference rows to save space.

---

## Rules
> Hard constraints. AI must follow unconditionally.

| Rule | Detail |
|------|--------|
| Multi-value Mapping | Natural language queries parsed with flavors, exclusions, or ingredients must enhance the underlying API parameters by merging them, rather than overwriting existing params |
| Tokenization Boundary | All keyword patterns must use word boundaries (`\b`) to prevent substring match collisions (e.g., matching "gin" in "ginger") |

---

## Reference
> Lookup tables. No prose.

### Extraction Pattern Categories

| Category | Patterns (Case-Insensitive) | Target Parameter |
|----------|-----------------------------|------------------|
| **Strength** | `light`, `weak`, `session`, `medium`, `balanced`, `strong`, `boozy`, `proof` | `preferred_strength` |
| **Flavors** | `bitter`, `sweet`, `sour`, `dry`, `herbal`, `fruity`, `spicy`, `smoky`, `refreshing`, `rich` | `preferred_flavors[]` |
| **Spirits** | `gin`, `whiskey` (`bourbon`/`rye`/`scotch`), `rum`, `vodka`, `tequila` (`mezcal`), `brandy` | `base_spirit` |
| **Glassware** | `martini`, `rocks` (`lowball`), `coupe`, `highball`, `nick` (`nick and nora`) | `glass_type` |
| **Methods** | `shake`, `stir`, `build`, `muddle` | `preparation_method` |
| **Exclusions** | Prefix indicator: `without`, `no`, `avoid`, `except`, `not`, `skip`, `minus` followed by term | `must_exclude[]` |

---

## Edge Cases
> Only document cases that are non-obvious or have caused bugs.

- **Exclusion Matching Group**: The exclusion pattern captures a lookahead phrase. Words immediately following the exclusion prefix are captured and added to the `must_exclude` array.
- **Strength-ABV Translation**: If `preferred_strength` is configured:
  - `light` sets `abv_max` to `15`
  - `medium` sets `abv_min` to `15` and `abv_max` to `30`
  - `strong` sets `abv_min` to `30`

---

*v1.0.0 — 2026-06-10*
