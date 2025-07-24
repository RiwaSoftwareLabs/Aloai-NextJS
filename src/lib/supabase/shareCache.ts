import { supabaseCache, cacheInvalidators } from './cache';
import { getFriends } from './friendship';
import { getRecentChatsForUser } from './aiChat';
import { supabase } from './client';
import type { Friend } from './friendship';
import type { Chat } from './aiChat';

// Cache interfaces
interface CachedShareData {
  friends: Friend[];
  aiUsers: Chat[];
  lastUpdated: number;
  version: string;
}

interface ShareTarget {
  id: string;
  name: string;
  type: 'friend' | 'ai';
  avatar?: string;
  userType?: string;
  lastSeen?: string;
  isOnline?: boolean;
  metadata?: Record<string, unknown>;
}

interface ShareCacheStats {
  cacheHits: number;
  cacheMisses: number;
  lastRefresh: number;
  dataVersion: string;
}



// Cache configuration
const CACHE_CONFIG = {
  TTL: 30000, // 30 seconds
  VERSION: '1.0.0',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// Cache keys
const CACHE_KEYS = {
  SHARE_DATA: 'share_data',
  SHARE_STATS: 'share_stats',
  FRIENDS_CACHE: 'friends',
  AI_USERS_CACHE: 'ai_users',
} as const;

class ShareCacheService {
  private stats = new Map<string, ShareCacheStats>();

  /**
   * Generate cache key for share data
   */
  private getShareDataKey(userId: string): string {
    return `${CACHE_KEYS.SHARE_DATA}:${userId}`;
  }

  /**
   * Generate cache key for share stats
   */
  private getShareStatsKey(userId: string): string {
    return `${CACHE_KEYS.SHARE_STATS}:${userId}`;
  }

  /**
   * Get cached share data
   */
  getCachedShareData(userId: string): CachedShareData | null {
    const key = this.getShareDataKey(userId);
    const cached = supabaseCache.get<CachedShareData>(key);
    
    if (cached && this.isValidCache(cached)) {
      this.recordCacheHit(userId);
      return cached;
    }
    
    this.recordCacheMiss(userId);
    return null;
  }

  /**
   * Set cached share data
   */
  setCachedShareData(userId: string, data: Omit<CachedShareData, 'lastUpdated' | 'version'>): void {
    const key = this.getShareDataKey(userId);
    const cachedData: CachedShareData = {
      ...data,
      lastUpdated: Date.now(),
      version: CACHE_CONFIG.VERSION,
    };
    
    supabaseCache.set(key, cachedData, CACHE_CONFIG.TTL);
  }

  /**
   * Check if cache is valid
   */
  private isValidCache(cached: CachedShareData): boolean {
    const now = Date.now();
    const age = now - cached.lastUpdated;
    const isValidAge = age < CACHE_CONFIG.TTL;
    const isValidVersion = cached.version === CACHE_CONFIG.VERSION;
    
    return isValidAge && isValidVersion;
  }

  /**
   * Fetch and cache share data
   */
  async fetchAndCacheShareData(userId: string): Promise<CachedShareData> {
    try {
      // Fetch data in parallel
      const [friendsResult, aiChatsResult] = await Promise.all([
        this.fetchFriendsWithRetry(userId),
        this.fetchAiUsersWithRetry(userId)
      ]);

      // Process and categorize friends
      const { regularFriends, aiFriends } = await this.categorizeFriends(userId, friendsResult);

      // Process AI users
      const processedAiUsers = await this.processAiUsers(userId, aiFriends, aiChatsResult);

      // Create cached data
      const shareData: Omit<CachedShareData, 'lastUpdated' | 'version'> = {
        friends: regularFriends,
        aiUsers: processedAiUsers,
      };

      // Cache the data
      this.setCachedShareData(userId, shareData);

      return {
        ...shareData,
        lastUpdated: Date.now(),
        version: CACHE_CONFIG.VERSION,
      };
    } catch (error) {
      console.error('Error fetching share data:', error);
      throw error;
    }
  }

  /**
   * Fetch friends with retry logic
   */
  private async fetchFriendsWithRetry(userId: string, retries = 0): Promise<Friend[]> {
    try {
      const result = await getFriends(userId);
      if (result.success) {
        return result.data;
      }
      throw new Error('Failed to fetch friends');
    } catch (error) {
      if (retries < CACHE_CONFIG.MAX_RETRIES) {
        await this.delay(CACHE_CONFIG.RETRY_DELAY * (retries + 1));
        return this.fetchFriendsWithRetry(userId, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Fetch AI users with retry logic
   */
  private async fetchAiUsersWithRetry(userId: string, retries = 0): Promise<Chat[]> {
    try {
      const result = await getRecentChatsForUser(userId);
      return result || [];
    } catch (error) {
      if (retries < CACHE_CONFIG.MAX_RETRIES) {
        await this.delay(CACHE_CONFIG.RETRY_DELAY * (retries + 1));
        return this.fetchAiUsersWithRetry(userId, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Categorize friends by user type
   */
  private async categorizeFriends(userId: string, friends: Friend[]): Promise<{
    regularFriends: Friend[];
    aiFriends: Friend[];
  }> {
    if (friends.length === 0) {
      return { regularFriends: [], aiFriends: [] };
    }

    const friendIds = friends.map(f => f.userId);
    const { data: usersData } = await supabase
      .from('users')
      .select('user_id, user_type, last_seen, display_name')
      .in('user_id', friendIds);

    if (!usersData) {
      return { regularFriends: friends, aiFriends: [] };
    }

    const regularFriends = friends.filter(friend => {
      const userData = usersData.find(u => u.user_id === friend.userId);
      return userData?.user_type === 'user';
    });

    const aiFriends = friends.filter(friend => {
      const userData = usersData.find(u => u.user_id === friend.userId);
      return userData?.user_type === 'ai' || userData?.user_type === 'super-ai';
    });

    return { regularFriends, aiFriends };
  }

  /**
   * Process AI users from friends and chats
   */
  private async processAiUsers(
    userId: string, 
    aiFriends: Friend[], 
    aiChats: Chat[]
  ): Promise<Chat[]> {
    // Convert AI friends to chat format
    const aiFriendChats: Chat[] = aiFriends.map(friend => ({
      id: `ai-${friend.userId}`,
      user_id: userId,
      receiver_id: friend.userId,
      title: friend.displayName,
      is_group: false,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      last_message_text: null,
    }));

    // Filter AI chats to only include users with user_type='ai' or 'super-ai'
    const aiChatsWithUserTypes = await this.filterAiChatsByUserType(aiChats, userId);

    // Combine and deduplicate
    const allAiUsers = [...aiFriendChats, ...aiChatsWithUserTypes];
    const uniqueAiUsers = this.deduplicateAiUsers(allAiUsers);

    return uniqueAiUsers;
  }

  /**
   * Filter AI chats to only include users with user_type='ai' or 'super-ai'
   */
  private async filterAiChatsByUserType(aiChats: Chat[], userId: string): Promise<Chat[]> {
    // Get all receiver IDs from chats
    const receiverIds = aiChats
      .filter(chat => chat.receiver_id && chat.receiver_id !== userId)
      .map(chat => chat.receiver_id!);

    if (receiverIds.length === 0) {
      return [];
    }

    // Fetch user types for all receiver IDs
    const { data: usersData } = await supabase
      .from('users')
      .select('user_id, user_type')
      .in('user_id', receiverIds);

    if (!usersData) {
      return [];
    }

    // Filter chats to only include AI users
    const aiUserIds = new Set(
      usersData
        .filter(user => user.user_type === 'ai' || user.user_type === 'super-ai')
        .map(user => user.user_id)
    );

    return aiChats.filter(chat => 
      chat.receiver_id && 
      chat.receiver_id !== userId && 
      aiUserIds.has(chat.receiver_id)
    );
  }

  /**
   * Deduplicate AI users by receiver_id
   */
  private deduplicateAiUsers(aiUsers: Chat[]): Chat[] {
    const seen = new Set<string>();
    return aiUsers.filter(chat => {
      if (!chat.receiver_id || seen.has(chat.receiver_id)) {
        return false;
      }
      seen.add(chat.receiver_id);
      return true;
    });
  }

  /**
   * Invalidate share cache for user
   */
  invalidateShareCache(userId: string): void {
    const shareDataKey = this.getShareDataKey(userId);
    const statsKey = this.getShareStatsKey(userId);
    
    supabaseCache.delete(shareDataKey);
    supabaseCache.delete(statsKey);
    
    // Invalidate related caches
    cacheInvalidators.friends(userId);
    cacheInvalidators.chats(userId);
  }

  /**
   * Get share targets for modal
   */
  getShareTargets(cachedData: CachedShareData): ShareTarget[] {
    const targets: ShareTarget[] = [];

    // Add friends
    cachedData.friends.forEach(friend => {
      targets.push({
        id: friend.userId,
        name: friend.displayName || 'Unknown',
        type: 'friend',
        avatar: friend.displayName?.charAt(0).toUpperCase(),
        metadata: { email: friend.email, createdAt: friend.createdAt }
      });
    });

    // Add AI users
    cachedData.aiUsers.forEach(ai => {
      targets.push({
        id: ai.receiver_id!,
        name: ai.title || 'AI Assistant',
        type: 'ai',
        userType: 'ai',
        metadata: { 
          chatId: ai.id, 
          isGroup: ai.is_group,
          lastMessageAt: ai.last_message_at,
          source: 'friend'
        }
      });
    });

    return targets;
  }

  /**
   * Filter share targets by search query
   */
  filterShareTargets(targets: ShareTarget[], query: string): ShareTarget[] {
    if (!query.trim()) return targets;
    
    const lowerQuery = query.toLowerCase();
    return targets.filter(target => 
      target.name.toLowerCase().includes(lowerQuery) ||
      (target.metadata?.email as string)?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(userId: string): void {
    const stats = this.getOrCreateStats(userId);
    stats.cacheHits++;
    this.updateStats(userId, stats);
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(userId: string): void {
    const stats = this.getOrCreateStats(userId);
    stats.cacheMisses++;
    this.updateStats(userId, stats);
  }

  /**
   * Get or create stats for user
   */
  private getOrCreateStats(userId: string): ShareCacheStats {
    const key = this.getShareStatsKey(userId);
    const cached = supabaseCache.get<ShareCacheStats>(key);
    
    if (cached) {
      return cached;
    }

    return {
      cacheHits: 0,
      cacheMisses: 0,
      lastRefresh: Date.now(),
      dataVersion: CACHE_CONFIG.VERSION,
    };
  }

  /**
   * Update stats for user
   */
  private updateStats(userId: string, stats: ShareCacheStats): void {
    const key = this.getShareStatsKey(userId);
    stats.lastRefresh = Date.now();
    supabaseCache.set(key, stats, CACHE_CONFIG.TTL);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(userId: string): ShareCacheStats | null {
    const key = this.getShareStatsKey(userId);
    return supabaseCache.get<ShareCacheStats>(key);
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(userId: string): number {
    const stats = this.getCacheStats(userId);
    if (!stats) return 0;
    
    const total = stats.cacheHits + stats.cacheMisses;
    return total > 0 ? (stats.cacheHits / total) * 100 : 0;
  }

  /**
   * Clear all share caches
   */
  clearAllShareCaches(): void {
    supabaseCache.clearByPattern(CACHE_KEYS.SHARE_DATA);
    supabaseCache.clearByPattern(CACHE_KEYS.SHARE_STATS);
  }

  /**
   * Utility: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const shareCacheService = new ShareCacheService();

// Export types for external use
export type { CachedShareData, ShareTarget, ShareCacheStats }; 