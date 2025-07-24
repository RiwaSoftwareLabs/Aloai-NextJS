import { supabaseCache } from './cache';
import type { Message } from './aiChat';

interface CachedMessages {
  messages: Message[];
  lastUpdated: number;
  chatId: string;
}

interface MessageCacheConfig {
  TTL: number;
  MAX_CACHED_CHATS: number;
}

const CACHE_CONFIG: MessageCacheConfig = {
  TTL: 60000, // 1 minute cache
  MAX_CACHED_CHATS: 5, // Cache last 5 chats
};

class MessageCacheService {
  private readonly CACHE_KEY_PREFIX = 'chat_messages';

  /**
   * Get cached messages for a chat
   */
  getCachedMessages(chatId: string): Message[] | null {
    const key = this.getCacheKey(chatId);
    const cached = supabaseCache.get<CachedMessages>(key);
    
    if (cached && this.isValidCache(cached)) {
      return cached.messages;
    }
    
    return null;
  }

  /**
   * Set cached messages for a chat
   */
  setCachedMessages(chatId: string, messages: Message[]): void {
    const key = this.getCacheKey(chatId);
    const cachedData: CachedMessages = {
      messages,
      lastUpdated: Date.now(),
      chatId,
    };
    
    supabaseCache.set(key, cachedData, CACHE_CONFIG.TTL);
  }

  /**
   * Invalidate cache for a chat
   */
  invalidateChatCache(chatId: string): void {
    const key = this.getCacheKey(chatId);
    supabaseCache.delete(key);
  }

  /**
   * Add new message to cache
   */
  addMessageToCache(chatId: string, message: Message): void {
    const cached = this.getCachedMessages(chatId);
    if (cached) {
      // Check if message already exists
      const exists = cached.some(m => m.id === message.id);
      if (!exists) {
        const updatedMessages = [...cached, message];
        this.setCachedMessages(chatId, updatedMessages);
      }
    }
  }

  /**
   * Update message in cache
   */
  updateMessageInCache(chatId: string, messageId: string, updates: Partial<Message>): void {
    const cached = this.getCachedMessages(chatId);
    if (cached) {
      const updatedMessages = cached.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
      this.setCachedMessages(chatId, updatedMessages);
    }
  }

  /**
   * Clear all message caches
   */
  clearAllCaches(): void {
    supabaseCache.clearByPattern(this.CACHE_KEY_PREFIX);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cachedChats: number; totalMessages: number } {
    // This is a simplified version - in a real implementation you'd track this
    return {
      cachedChats: 0,
      totalMessages: 0,
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(chatId: string): string {
    return `${this.CACHE_KEY_PREFIX}:${chatId}`;
  }

  /**
   * Check if cache is valid
   */
  private isValidCache(cached: CachedMessages): boolean {
    const now = Date.now();
    const age = now - cached.lastUpdated;
    return age < CACHE_CONFIG.TTL;
  }
}

// Export singleton instance
export const messageCacheService = new MessageCacheService();

// Export types for external use
export type { CachedMessages, MessageCacheConfig }; 