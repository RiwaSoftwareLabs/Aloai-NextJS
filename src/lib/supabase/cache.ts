// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Cache storage
class SupabaseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  
  // Default TTL values (in milliseconds)
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly SHORT_TTL = 30 * 1000; // 30 seconds
  private readonly LONG_TTL = 15 * 60 * 1000; // 15 minutes
  
  // Cache keys for different data types
  private readonly CACHE_KEYS = {
    USER_PROFILE: 'user_profile',
    USER_LAST_SEEN: 'user_last_seen',
    FRIENDS: 'friends',
    PENDING_REQUESTS: 'pending_requests',
    SENT_REQUESTS: 'sent_requests',
    CHATS: 'chats',
    FRIENDSHIP_STATUS: 'friendship_status',
    USER_BY_EMAIL: 'user_by_email',
    USER_BY_ID: 'user_by_id',
  } as const;

  /**
   * Generate cache key with parameters
   */
  private generateKey(baseKey: string, params: Record<string, unknown> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return sortedParams ? `${baseKey}:${sortedParams}` : baseKey;
  }

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache by pattern
   */
  clearByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate user-related cache
   */
  invalidateUserCache(userId: string): void {
    this.clearByPattern(`user_profile:${userId}`);
    this.clearByPattern(`user_last_seen:${userId}`);
    this.clearByPattern(`friends:${userId}`);
    this.clearByPattern(`pending_requests:${userId}`);
    this.clearByPattern(`sent_requests:${userId}`);
    this.clearByPattern(`chats:${userId}`);
  }

  /**
   * Invalidate friendship-related cache
   */
  invalidateFriendshipCache(userId: string): void {
    this.clearByPattern(`friends:${userId}`);
    this.clearByPattern(`pending_requests:${userId}`);
    this.clearByPattern(`sent_requests:${userId}`);
    this.clearByPattern(`friendship_status:${userId}`);
  }

  /**
   * Invalidate chat-related cache
   */
  invalidateChatCache(userId: string): void {
    this.clearByPattern(`chats:${userId}`);
  }

  // Cache key generators
  getUserProfileKey(userId: string): string {
    return this.generateKey(this.CACHE_KEYS.USER_PROFILE, { userId });
  }

  getUserLastSeenKey(userId: string): string {
    return this.generateKey(this.CACHE_KEYS.USER_LAST_SEEN, { userId });
  }

  getFriendsKey(userId: string): string {
    return this.generateKey(this.CACHE_KEYS.FRIENDS, { userId });
  }

  getPendingRequestsKey(userId: string): string {
    return this.generateKey(this.CACHE_KEYS.PENDING_REQUESTS, { userId });
  }

  getSentRequestsKey(userId: string): string {
    return this.generateKey(this.CACHE_KEYS.SENT_REQUESTS, { userId });
  }

  getChatsKey(userId: string): string {
    return this.generateKey(this.CACHE_KEYS.CHATS, { userId });
  }

  getFriendshipStatusKey(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return this.generateKey(this.CACHE_KEYS.FRIENDSHIP_STATUS, { 
      userId1: sortedIds[0], 
      userId2: sortedIds[1] 
    });
  }

  getUserByEmailKey(email: string): string {
    return this.generateKey(this.CACHE_KEYS.USER_BY_EMAIL, { email });
  }

  getUserByIdKey(userId: string): string {
    return this.generateKey(this.CACHE_KEYS.USER_BY_ID, { userId });
  }

  // TTL getters
  getShortTTL(): number {
    return this.SHORT_TTL;
  }

  getDefaultTTL(): number {
    return this.DEFAULT_TTL;
  }

  getLongTTL(): number {
    return this.LONG_TTL;
  }
}

// Export singleton instance
export const supabaseCache = new SupabaseCache();

// Cache decorator for functions
export function withCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const cacheKey = keyGenerator(...args);
    const cached = supabaseCache.get<ReturnType<T>>(cacheKey);
    
    if (cached !== null) {
      return cached;
    }

    const result = await fn(...args);
    supabaseCache.set(cacheKey, result, ttl);
    return result as ReturnType<T>;
  }) as T;
}

// Cache invalidation helpers
export const cacheInvalidators = {
  userProfile: (userId: string) => supabaseCache.delete(supabaseCache.getUserProfileKey(userId)),
  userLastSeen: (userId: string) => supabaseCache.delete(supabaseCache.getUserLastSeenKey(userId)),
  friends: (userId: string) => supabaseCache.delete(supabaseCache.getFriendsKey(userId)),
  pendingRequests: (userId: string) => supabaseCache.delete(supabaseCache.getPendingRequestsKey(userId)),
  sentRequests: (userId: string) => supabaseCache.delete(supabaseCache.getSentRequestsKey(userId)),
  chats: (userId: string) => supabaseCache.delete(supabaseCache.getChatsKey(userId)),
  friendshipStatus: (userId1: string, userId2: string) => 
    supabaseCache.delete(supabaseCache.getFriendshipStatusKey(userId1, userId2)),
  userByEmail: (email: string) => supabaseCache.delete(supabaseCache.getUserByEmailKey(email)),
  userById: (userId: string) => supabaseCache.delete(supabaseCache.getUserByIdKey(userId)),
  allUserData: (userId: string) => supabaseCache.invalidateUserCache(userId),
  allFriendshipData: (userId: string) => supabaseCache.invalidateFriendshipCache(userId),
  allChatData: (userId: string) => supabaseCache.invalidateChatCache(userId),
}; 