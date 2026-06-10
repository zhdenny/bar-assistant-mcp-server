/**
 * Cache Manager for Bar Assistant MCP Server
 * Provides intelligent caching for recipes and search results
 */

import { DetailedRecipe, CocktailSearchResult } from './types.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
}

// Generic response type for MCP responses
export type MCPResponse = CocktailSearchResult | { content: { type: string; text: string }[] } | any;

export class CacheManager {
  private recipeCache = new Map<number, CacheEntry<DetailedRecipe>>();
  private searchCache = new Map<string, CacheEntry<MCPResponse>>();
  private readonly cacheExpiry: number;
  private readonly maxCacheSize: number;

  constructor(options: { ttl?: number; maxSize?: number } = {}) {
    this.cacheExpiry = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxCacheSize = options.maxSize || 1000; // 1000 entries default
  }

  getCachedRecipe(id: number): DetailedRecipe | null {
    const cached = this.recipeCache.get(id);
    if (cached && this.isValid(cached)) {
      cached.accessCount++;
      return cached.data;
    }
    
    if (cached) {
      this.recipeCache.delete(id); // Remove expired entry
    }
    return null;
  }

  setCachedRecipe(id: number, data: DetailedRecipe): void {
    this.evictIfNeeded(this.recipeCache);
    this.recipeCache.set(id, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  getCachedSearch(query: string): MCPResponse | null {
    const cached = this.searchCache.get(query);
    if (cached && this.isValid(cached)) {
      cached.accessCount++;
      return cached.data;
    }
    
    if (cached) {
      this.searchCache.delete(query); // Remove expired entry
    }
    return null;
  }

  setCachedSearch(query: string, data: MCPResponse): void {
    this.evictIfNeeded(this.searchCache);
    this.searchCache.set(query, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < this.cacheExpiry;
  }

  private evictIfNeeded<K, T>(cache: Map<K, CacheEntry<T>>): void {
    if (cache.size >= this.maxCacheSize) {
      // Evict least recently used entries (by access count and age)
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => {
        const scoreA = a[1].accessCount / Math.max(1, Date.now() - a[1].timestamp);
        const scoreB = b[1].accessCount / Math.max(1, Date.now() - b[1].timestamp);
        return scoreA - scoreB;
      });
      
      // Remove bottom 25% of entries
      const toRemove = Math.floor(this.maxCacheSize * 0.25);
      for (let i = 0; i < toRemove; i++) {
        cache.delete(entries[i][0]);
      }
    }
  }

  getStats() {
    return {
      recipeCacheSize: this.recipeCache.size,
      searchCacheSize: this.searchCache.size,
      recipeCacheHits: Array.from(this.recipeCache.values()).reduce((sum, entry) => sum + entry.accessCount, 0),
      searchCacheHits: Array.from(this.searchCache.values()).reduce((sum, entry) => sum + entry.accessCount, 0)
    };
  }

  clear(): void {
    this.recipeCache.clear();
    this.searchCache.clear();
  }
}