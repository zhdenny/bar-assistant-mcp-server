# REF_developer-reference — Developer reference tables

> Reference only. Rules live in `GUIDE_developer.md`.

---

## Reference

### Naming Conventions

| Type | Rule | Do | Don't |
|------|------|----|-------|
| Functions | `camelCase`, verb + noun | `getItemById`, `fetchSchema` | `doStuff`, `thing` |
| Variables | intent first, avoid generic names | `itemList`, `configData` | `data`, `tmp` |
| Booleans | prefix `is` / `has` / `can` / `should` | `isValid`, `hasItems` | `flag`, `state` |
| Event handlers | prefix `handle` + target + event | `handleSubmitClick`, `handleFilterChange` | `onClick`, `clickHandler` |
| Async functions | action-oriented, name what is fetched or saved | `fetchItemList`, `saveUserSettings` | `getData`, `loadStuff` |
| Data objects | context + subject + type | `UserAuthInfo`, `systemStateMap` | `payload`, `thingObject` |
| Files (logic) | responsibility-first, use role suffix when useful | `storage-manager.ts`, `board-renderer.ts` | `utils.ts`, `misc.ts` |

### Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm test` | Run tests |
| `npm run build` | Production build |
| `npm version [patch/minor/major]` | Sync version across all files |

### Version

| Item | Detail |
|------|--------|
| Source of truth | `package.json` |
| Bump command | `npm version` |
| Files auto-updated | `package.json`, `package-lock.json` |

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `BAR_ASSISTANT_URL` | Yes | None | Base URL of the Bar Assistant instance |
| `BAR_ASSISTANT_TOKEN` | Yes | None | API token for authentication |
| `BAR_ASSISTANT_BAR_ID` | No | `1` | Bar ID context for queries |
| `PORT` | No | `3001` | Server port used in SSE/gateway modes |
| `MCP_SSE_TOKEN` | Yes (in SSE/gateway) | None | Token for client authentication in SSE and gateway modes |
| `GEMINI_CONFIG_DIR` | Yes (if using Docker) | None | Host path to the `.gemini` configuration directory for agy access |

### Docker Deployment Configurations

| Configuration Item | Value / Mapping | Purpose |
|--------------------|-----------------|---------|
| Default SSE Port | `3001` | Port exposed by Docker container |
| Image Name | `zhdenny/bar-assistant-mcp-server:latest` | Public Docker Registry image name |
| Unraid Icon Label | `net.unraid.docker.icon` | Bound to `/mnt/user/appdata/bar-assistant/icon.png` |
| Google Antigravity Volume | `${GEMINI_CONFIG_DIR}:/root/.gemini` | Mount host configuration/credentials directory for agy execution |

---

*v1.0.1 — 2026-06-19*


