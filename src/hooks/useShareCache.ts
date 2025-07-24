import { useState, useEffect, useCallback } from 'react';
import { shareCacheService, type ShareTarget } from '@/lib/supabase/shareCache';
import { getCurrentUser } from '@/lib/supabase/auth';

interface UseShareCacheReturn {
  friends: ShareTarget[];
  aiUsers: ShareTarget[];
  isLoading: boolean;
  cacheStatus: 'loading' | 'cached' | 'fresh';
  refresh: () => Promise<void>;
  invalidateCache: () => void;
  getCacheStats: () => { hitRate: number; lastRefresh: number } | null;
}

export const useShareCache = (): UseShareCacheReturn => {
  const [friends, setFriends] = useState<ShareTarget[]>([]);
  const [aiUsers, setAiUsers] = useState<ShareTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'loading' | 'cached' | 'fresh'>('loading');
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch and cache share data
  const fetchShareData = useCallback(async (currentUserId: string) => {
    setIsLoading(true);
    setCacheStatus('loading');

    try {
      // Try to get cached data first
      const cachedData = shareCacheService.getCachedShareData(currentUserId);
      
      if (cachedData) {
        const targets = shareCacheService.getShareTargets(cachedData);
        const friendTargets = targets.filter(t => t.type === 'friend');
        const aiTargets = targets.filter(t => t.type === 'ai');
        
        setFriends(friendTargets);
        setAiUsers(aiTargets);
        setCacheStatus('cached');
        setIsLoading(false);
        return;
      }

      // Fetch fresh data
      const freshData = await shareCacheService.fetchAndCacheShareData(currentUserId);
      const targets = shareCacheService.getShareTargets(freshData);
      const friendTargets = targets.filter(t => t.type === 'friend');
      const aiTargets = targets.filter(t => t.type === 'ai');
      
      setFriends(friendTargets);
      setAiUsers(aiTargets);
      setCacheStatus('fresh');

    } catch (error) {
      console.error('Error fetching share data:', error);
      setCacheStatus('fresh');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize user and fetch data
  useEffect(() => {
    const initializeUser = async () => {
      const { user } = await getCurrentUser();
      if (user?.id) {
        setUserId(user.id);
        await fetchShareData(user.id);
      }
    };

    initializeUser();
  }, [fetchShareData]);

  // Refresh data
  const refresh = useCallback(async () => {
    if (userId) {
      shareCacheService.invalidateShareCache(userId);
      await fetchShareData(userId);
    }
  }, [userId, fetchShareData]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    if (userId) {
      shareCacheService.invalidateShareCache(userId);
    }
  }, [userId]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    if (!userId) return null;
    
    const stats = shareCacheService.getCacheStats(userId);
    if (!stats) return null;
    
    return {
      hitRate: shareCacheService.getCacheHitRate(userId),
      lastRefresh: stats.lastRefresh,
    };
  }, [userId]);

  return {
    friends,
    aiUsers,
    isLoading,
    cacheStatus,
    refresh,
    invalidateCache,
    getCacheStats,
  };
}; 