/**
 * RSS Cache System
 *
 * Simple in-memory cache for RSS feeds to avoid fetching on every request.
 * In production, this could be replaced with Redis or similar.
 *
 * Philosophy: Keep it simple for MVP, make it easy to swap later.
 */

import { Article } from "@/types/article";

interface CacheEntry {
  data: Article[];
  timestamp: number;
  expiresAt: number;
}

class RSSCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Get cached data if available and not expired
   */
  get(key: string): Article[] | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache with custom TTL (in minutes)
   */
  set(key: string, data: Article[], ttlMinutes?: number): void {
    const now = Date.now();
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL;

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    this.cache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    });

    return {
      size: this.cache.size,
      valid,
      expired,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Singleton instance
export const rssCache = new RSSCache();

// Auto-cleanup every 5 minutes
if (typeof window === "undefined") {
  // Only run cleanup on server-side
  setInterval(() => {
    rssCache.cleanup();
  }, 5 * 60 * 1000);
}
