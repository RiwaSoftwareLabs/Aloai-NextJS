// Cache for copied message content to avoid repeated DOM queries
class CopyCache {
  private cache = new Map<string, string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private timestamps = new Map<string, number>();

  /**
   * Get cached message content
   */
  get(messageId: string): string | null {
    const timestamp = this.timestamps.get(messageId);
    if (!timestamp || Date.now() - timestamp > this.CACHE_TTL) {
      this.delete(messageId);
      return null;
    }
    return this.cache.get(messageId) || null;
  }

  /**
   * Set cached message content
   */
  set(messageId: string, content: string): void {
    this.cache.set(messageId, content);
    this.timestamps.set(messageId, Date.now());
  }

  /**
   * Delete cached message content
   */
  delete(messageId: string): void {
    this.cache.delete(messageId);
    this.timestamps.delete(messageId);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  /**
   * Get message content from DOM or cache
   */
  async getMessageContent(messageId: string): Promise<string> {
    // Try to get from cache first
    const cached = this.get(messageId);
    if (cached) {
      return cached;
    }

    // If not in cache, get from DOM
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      const content = messageElement.textContent || '';
      this.set(messageId, content);
      return content;
    }

    return '';
  }

  /**
   * Copy message content to clipboard with caching
   */
  async copyMessageContent(messageId: string): Promise<boolean> {
    try {
      const content = await this.getMessageContent(messageId);
      if (content) {
        await navigator.clipboard.writeText(content);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error copying message content:', error);
      return false;
    }
  }
}

// Export singleton instance
export const copyCache = new CopyCache(); 