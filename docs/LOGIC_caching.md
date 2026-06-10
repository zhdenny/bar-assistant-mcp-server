# LOGIC_caching — Caching Layer Rules and Eviction

> **Compact, not incomplete.** Remove sections with no content. Never remove rules, edge cases, or reference rows to save space.

---

## Rules
> Hard constraints. AI must follow unconditionally.

| Rule | Detail |
|------|--------|
| Expiry Check | Every cache lookup must validate the timestamp against the configured TTL before returning data |
| Eviction Policy | When cache limit is reached, evict the bottom 25% of entries based on the LRU access score |
| Score Formula | LRU score is calculated as `accessCount / (Date.now() - timestamp)` |

---

## Reference
> Lookup tables. No prose.

### Cache Configuration Default Settings

| Setting | Default Value | Notes |
|---------|---------------|-------|
| `cacheExpiry` (TTL) | 5 minutes (`300000` ms) | Customizable via options in constructor |
| `maxCacheSize` | 1000 entries | Maximum number of entries before eviction is triggered |

---

## Edge Cases
> Only document cases that are non-obvious or have caused bugs.

- **Eviction Triggers**: Eviction is triggered *before* a new entry is set to prevent memory pressure.
- **Access Counts**: Successful cache hits increment the `accessCount` which affects the eviction score.

---

*v1.0.0 — 2026-06-10*
