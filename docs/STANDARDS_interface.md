# STANDARDS_interface — IO specifications for Bar Assistant MCP Server

---

## Rules

> Hard constraints for this domain. AI must follow unconditionally.

| Rule | Detail |
|------|--------|
| No magic numbers | All values must come from tokens or shared constants |
| Conversational Text | All tool responses must include structured JSON data in addition to clean human-readable markdown text |
| Volume Units | All volume metrics must display rounded ounce values (e.g., `1.5oz` or `0.75oz`) rather than raw milliliters |
| Matching Highlights | Searched ingredients should be highlighted in bold with a pointing arrow pointing to the matched query (e.g., `• **1oz Campari** ← *campari*`) |

---

## Interface Reference

### Markdown Output Templates

#### 1. Single Cocktail Format
```markdown
# 🍸 **COCKTAIL NAME**

🥃 **30% ABV**  •  🥂 **Coupe**  •  🔧 **Stir**

> *Brief description or tasting notes.*

**📍 ID:** `123`  •  **🔗 [View Recipe](link)**

## 🧾 Ingredients
• 2oz Rye Whiskey
• 1oz Sweet Vermouth
• 2 dashes Angostura Bitters

## 📋 Instructions
**1.** Combine all ingredients in a mixing glass with ice.
**2.** Stir until chilled and strain into a coupe.

**🌿 Garnish:** *Cherry*
**📚 Source:** *Classic Recipes*
**🏷️ Tags:** *Classic, Strong*
```

#### 2. Multi-Cocktail Format (Separator)
```markdown
# 🍸 1. **NAME ONE**
...
---
# 🍸 2. **NAME TWO**
...
```

### JSON Payload Schemas

| Payload Shape | Key Required Fields | Purpose |
|---------------|---------------------|---------|
| `CocktailResult` | `id`, `name`, `ingredients`, `instructions`, `details` | Base cocktail structure |
| `ResponseMetadata` | `source`, `timestamp`, `result_count` | Response execution summary |
| `CocktailSearchResponse` | `results`, `query`, `metadata` | Collection output for queries |
| `RecipeResponse` | `result`, `query`, `metadata` | Single recipe retrieval structure |
| `IngredientInfoResponse` | `ingredient`, `cocktail_usage`, `query`, `metadata` | Ingredient metadata details |

---

## Edge Cases

- **Missing Details**: If ABV, glass type, method, or garnish are not returned by the API, they must be cleanly omitted from the output block rather than displaying empty or undefined values.


---

*v1.0.0 — 2026-06-10*
