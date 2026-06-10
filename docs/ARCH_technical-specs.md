# ARCH_technical-specs — Core architecture and data models for Bar Assistant MCP Server

> **Compact, not incomplete.** Remove sections with no content. Never remove rules, edge cases, or reference rows to save space.

---

## Rules
> Hard constraints. AI must follow unconditionally.

| Rule | Detail |
|------|--------|
| Output validation | All MCP tool responses must be validated against their corresponding output schema in `src/output-schemas.ts` |
| Error handling | API errors must be mapped to the standardized `ErrorResponse` format |
| Numeric IDs | Bar Assistant IDs are numeric (`number`) and must be handled as such |

---

## Reference
> Lookup tables. No prose.

### Core Data Models

| Interface | Source File | Description |
|-----------|-------------|-------------|
| `Cocktail` | `src/types.ts` | Complete representation of a cocktail in Bar Assistant |
| `CocktailIngredient` | `src/types.ts` | Representation of an ingredient used in a cocktail, including amount, units, and optional flag |
| `DetailedRecipe` | `src/types.ts` | Extends `Cocktail` with instructions and ingredients list |
| `InventoryStatus` | `src/types.ts` | Available ingredients and lists of cocktails that can be made |
| `ShoppingList` | `src/types.ts` | List of items needed to make a set of cocktails |

### Output Schemas

| Schema | Target Response | Usage |
|--------|-----------------|-------|
| `cocktailSearchOutputSchema` | `CocktailSearchResponse` | Validates cocktail search and smart search results |
| `recipeOutputSchema` | `RecipeResponse` | Validates recipe lookup and similarity recommendations |
| `ingredientInfoOutputSchema` | `IngredientInfoResponse` | Validates ingredient detail queries and substitutions |
| `errorOutputSchema` | `ErrorResponse` | Validates error details sent back to the client |

---

## Execution Modes & System Boundaries

### 1. Stdio Mode (Default)
- Standard input/output transport layer for local MCP client interactions.
- Direct stdin/stdout message processing.

### 2. SSE Mode (`--sse` argument)
- Starts Express server on configured port (default: `3001`).
- Endpoint `/sse`: Establishes Server-Sent Events client transport.
- Endpoint `/message`: Receives client messages via POST. Requires the `sessionId` query parameter for routing to the correct client connection.
- Rate limiting: Max 100 requests per 15-minute window.
- Security: Optional `helmet` header protection.

### 3. SSE Authentication Middleware
Authentication is validated against the `MCP_API_KEY` environment variable. Access is granted if any of the following match:
- Header: `Authorization: Bearer <API_KEY>`
- Header: `X-API-Key: <API_KEY>`
- Query Parameter: `?apiKey=<API_KEY>`

---

## API Client Integration

### 1. Request Configuration
- Base URL configured via `BAR_ASSISTANT_URL`.
- Authorization header populated with `Bearer <BAR_ASSISTANT_TOKEN>`. Whitespace in token is stripped automatically.
- Bar ID passed via `Bar-Assistant-Bar-Id` header (defaults to `1`).

### 2. Interceptor Layer
- Request Interceptor: Pass-through for Axios requests.
- Response Interceptor: Catches failures and maps response details to a structured `ApiError` format.

---


## Edge Cases
> Only document cases that are non-obvious or have caused bugs.

- **Missing ingredients in inventory**: The `InventoryStatus` interface uses `any[]` for `missing_ingredients` to simplify structure. Ensure type assertions are safe when querying this field.

---

*v1.0.0 — 2026-06-10*
