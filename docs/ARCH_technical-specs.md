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

### 2. SSE & Streamable HTTP Mode (`--sse` argument)
- Starts Express server on configured port (default: `3001`).
- **Hybrid Routing Layer**:
  - **Legacy SSE Transport**:
    - `GET /sse`: Establishes Server-Sent Events transport via standard `SSEServerTransport`.
    - `POST /message`: Routes client JSON-RPC messages using the `sessionId` query parameter.
  - **Modern Streamable HTTP Transport**:
    - Used by modern MCP clients (e.g., `agy`).
    - `POST /sse` (Handshake/Message): If no `mcp-session-id` header is present, initializes a stateful `StreamableHTTPTransport` instance, connects it to the MCP server, and generates a session ID returned via the `mcp-session-id` response header. Subsequent calls with this header route requests to the associated session, returning responses synchronously.
    - `GET /sse` (Event Stream): Establishes the asynchronous event stream for a session when the `mcp-session-id` header or query parameter is provided.
    - `DELETE /sse` (Cleanup): Closes and releases the `StreamableHTTPTransport` instance and its event stream connection.
- **Proxy Buffering Prevention (Critical)**:
  - Custom headers are sent on all event-stream responses to prevent reverse proxies (e.g., Nginx, Docker bridges) from buffering packets:
    - `X-Accel-Buffering: no`
    - `Cache-Control: no-cache, no-transform`
    - `Connection: keep-alive`
  - Servers must call `res.flushHeaders()` immediately and write a dummy `: keep-alive\n\n` comment to force connection establishment.
- Security:
  - Optional `helmet` header protection.
  - Mandatory token authentication via the `MCP_SSE_TOKEN` environment variable on all SSE endpoints (`/sse`, `/message`, `/debug`).
  - **Token Normalization**: Server and client tokens are normalized (quotes and whitespace stripped) prior to comparison.
  - **Active Session Bypass**: Requests using a session ID that matches a currently active session in `transports` bypass token validation. This avoids authentication failures if proxy routing or client settings omit credentials on subsequent messages.
  - Otherwise, clients must authenticate via:
    - `Authorization` header (e.g., `Bearer <token>` or plain `<token>`).
    - Query parameter (e.g., `?token=<token>`, `?apiKey=<token>`, or `?api_key=<token>`).

### 3. PourOver Gateway Mode (Unified)
- Exposes a unified POST `/query` endpoint on the same Express server port.
- Authenticates using `MCP_SSE_TOKEN` (supports `Authorization` header, `x-api-key` header, or query parameters).
- Validates that the query is non-empty.
- Spawns the Google Antigravity CLI (`agy`) as a child process and streams its stdout/stderr directly back to the client using `text/plain` media type.
- Returns FastAPI-compatible error responses: `{"detail": "<error_message>"}` on failure.
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

*v1.0.6 — 2026-06-13*
- Documented mandatory SSE token authentication.

*v1.0.0 — 2026-06-10*
