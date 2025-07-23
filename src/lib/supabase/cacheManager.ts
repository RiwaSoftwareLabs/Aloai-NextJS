import { supabaseCache } from './cache';
import { copyCache } from './copyCache';

// Cache statistics interface
interface CacheStats {
  name: string;
  size: number;
  hitRate: number;
  hits: number;
  misses: number;
}

// Cache manager class
class CacheManager {
  private stats = new Map<string, { hits: number; misses: number }>();

  /**
   * Get statistics for all caches
   */
  getStats(): CacheStats[] {
    const stats: CacheStats[] = [];

    // Supabase cache stats (approximate)
    const supabaseCacheSize = this.getMapSize();
    const supabaseStats = this.stats.get('supabase') || { hits: 0, misses: 0 };
    const supabaseHitRate = supabaseStats.hits + supabaseStats.misses > 0 
      ? (supabaseStats.hits / (supabaseStats.hits + supabaseStats.misses)) * 100 
      : 0;

    stats.push({
      name: 'Supabase Cache',
      size: supabaseCacheSize,
      hitRate: supabaseHitRate,
      hits: supabaseStats.hits,
      misses: supabaseStats.misses
    });

    // Copy cache stats
    const copyCacheSize = this.getMapSize();
    const copyStats = this.stats.get('copy') || { hits: 0, misses: 0 };
    const copyHitRate = copyStats.hits + copyStats.misses > 0 
      ? (copyStats.hits / (copyStats.hits + copyStats.misses)) * 100 
      : 0;

    stats.push({
      name: 'Copy Cache',
      size: copyCacheSize,
      hitRate: copyHitRate,
      hits: copyStats.hits,
      misses: copyStats.misses
    });

    return stats;
  }

  /**
   * Record a cache hit
   */
  recordHit(cacheName: string): void {
    const current = this.stats.get(cacheName) || { hits: 0, misses: 0 };
    current.hits++;
    this.stats.set(cacheName, current);
  }

  /**
   * Record a cache miss
   */
  recordMiss(cacheName: string): void {
    const current = this.stats.get(cacheName) || { hits: 0, misses: 0 };
    current.misses++;
    this.stats.set(cacheName, current);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    supabaseCache.clear();
    copyCache.clear();
    this.stats.clear();
  }

  /**
   * Get cache size (approximate for private maps)
   */
  private getMapSize(): number {
    // This is an approximation since we can't access private maps
    // In a real implementation, you'd expose size methods
    return 0; // Placeholder
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): number {
    // This would require actual implementation to track memory usage
    // For now, return a placeholder
    return 0;
  }

  /**
   * Optimize caches (remove expired entries, etc.)
   */
  optimize(): void {
    // This would trigger cleanup of expired entries
    // For now, just clear stats
    this.stats.clear();
  }

  /**
   * Export cache data for debugging
   */
  exportDebugData(): Record<string, unknown> {
    return {
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Cache performance monitoring
export function withCacheMonitoring<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  cacheName: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = performance.now();
    
    try {
      const result = await fn(...args);
      const endTime = performance.now();
      
      // Record performance metrics
      console.debug(`Cache operation ${cacheName} completed in ${endTime - startTime}ms`);
      
      return result as ReturnType<T>;
    } catch (error) {
      console.error(`Cache operation ${cacheName} failed:`, error);
      throw error;
    }
  }) as T;
} 