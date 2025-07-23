import { supabaseCache, cacheInvalidators } from './cache';
import { getCurrentUser } from './auth';

// Reaction data interface
export interface ReactionData {
  likes_count: number;
  dislikes_count: number;
  user_reaction: 'like' | 'dislike' | null;
}

// Optimistic update interface
export interface OptimisticReactionUpdate {
  messageId: string;
  reactionType: 'like' | 'dislike';
  previousReaction: 'like' | 'dislike' | null;
  timestamp: number;
}

// Cache for optimistic updates
const optimisticUpdates = new Map<string, OptimisticReactionUpdate>();

/**
 * Get cached reaction data for a message
 */
export async function getCachedMessageReactions(messageId: string): Promise<ReactionData | null> {
  const cacheKey = supabaseCache.getMessageReactionsKey(messageId);
  return supabaseCache.get<ReactionData>(cacheKey);
}

/**
 * Cache reaction data for a message
 */
export function cacheMessageReactions(messageId: string, reactions: ReactionData): void {
  const cacheKey = supabaseCache.getMessageReactionsKey(messageId);
  // Cache for 10 minutes since reactions don't change frequently
  supabaseCache.set(cacheKey, reactions, 10 * 60 * 1000);
}

/**
 * Get cached user reaction for a specific message
 */
export async function getCachedUserReaction(messageId: string, userId: string): Promise<'like' | 'dislike' | null> {
  const cacheKey = supabaseCache.getUserReactionKey(messageId, userId);
  return supabaseCache.get<'like' | 'dislike' | null>(cacheKey) || null;
}

/**
 * Cache user reaction for a specific message
 */
export function cacheUserReaction(messageId: string, userId: string, reaction: 'like' | 'dislike' | null): void {
  const cacheKey = supabaseCache.getUserReactionKey(messageId, userId);
  // Cache for 15 minutes
  supabaseCache.set(cacheKey, reaction, 15 * 60 * 1000);
}

/**
 * Calculate optimistic reaction update
 */
export function calculateOptimisticReaction(
  currentReactions: ReactionData,
  newReactionType: 'like' | 'dislike'
): ReactionData {
  const newReactions = { ...currentReactions };
  const currentUserReaction = currentReactions.user_reaction;

  // If clicking the same reaction, remove it
  if (currentUserReaction === newReactionType) {
    if (newReactionType === 'like') {
      newReactions.likes_count = Math.max(0, newReactions.likes_count - 1);
    } else {
      newReactions.dislikes_count = Math.max(0, newReactions.dislikes_count - 1);
    }
    newReactions.user_reaction = null;
  } else {
    // If changing reaction or adding new one
    if (currentUserReaction === 'like' && newReactionType === 'dislike') {
      newReactions.likes_count = Math.max(0, newReactions.likes_count - 1);
      newReactions.dislikes_count = newReactions.dislikes_count + 1;
    } else if (currentUserReaction === 'dislike' && newReactionType === 'like') {
      newReactions.dislikes_count = Math.max(0, newReactions.dislikes_count - 1);
      newReactions.likes_count = newReactions.likes_count + 1;
    } else if (currentUserReaction === null) {
      // New reaction
      if (newReactionType === 'like') {
        newReactions.likes_count = newReactions.likes_count + 1;
      } else {
        newReactions.dislikes_count = newReactions.dislikes_count + 1;
      }
    }
    newReactions.user_reaction = newReactionType;
  }

  return newReactions;
}

/**
 * Add optimistic update to cache
 */
export function addOptimisticUpdate(
  messageId: string,
  reactionType: 'like' | 'dislike',
  previousReaction: 'like' | 'dislike' | null
): void {
  optimisticUpdates.set(messageId, {
    messageId,
    reactionType,
    previousReaction,
    timestamp: Date.now()
  });
}

/**
 * Remove optimistic update from cache
 */
export function removeOptimisticUpdate(messageId: string): void {
  optimisticUpdates.delete(messageId);
}

/**
 * Get optimistic update for a message
 */
export function getOptimisticUpdate(messageId: string): OptimisticReactionUpdate | null {
  return optimisticUpdates.get(messageId) || null;
}

/**
 * Invalidate reaction caches for a message
 */
export function invalidateReactionCaches(messageId: string): void {
  cacheInvalidators.messageReactions(messageId);
}

/**
 * Batch cache reaction data for multiple messages
 */
export function batchCacheReactions(
  reactions: Array<{ messageId: string; reactions: ReactionData }>
): void {
  reactions.forEach(({ messageId, reactions }) => {
    cacheMessageReactions(messageId, reactions);
  });
}

/**
 * Get current user ID for reaction operations
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { user } = await getCurrentUser();
  return user?.id || null;
}

/**
 * Prefetch reaction data for multiple messages
 */
export async function prefetchReactions(
  messageIds: string[],
  fetchFunction: (messageId: string) => Promise<ReactionData>
): Promise<void> {
  const reactionsToCache: Array<{ messageId: string; reactions: ReactionData }> = [];

  await Promise.all(
    messageIds.map(async (messageId) => {
      // Check if already cached
      const cached = await getCachedMessageReactions(messageId);
      if (!cached) {
        try {
          const reactions = await fetchFunction(messageId);
          reactionsToCache.push({ messageId, reactions });
        } catch (error) {
          console.error(`Error prefetching reactions for message ${messageId}:`, error);
        }
      }
    })
  );

  // Batch cache the fetched reactions
  batchCacheReactions(reactionsToCache);
} 