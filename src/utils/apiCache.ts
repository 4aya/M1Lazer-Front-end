import { chatAPI, userAPI } from './api';
import type { ChatChannel, ChatMessage, User } from '../types';

// APICache Manager
class APICache {
  private userCache = new Map<number, { data: User; timestamp: number }>();
  private channelMessagesCache = new Map<number, { data: ChatMessage[]; timestamp: number }>();
  private channelListCache: { data: ChatChannel[]; timestamp: number } | null = null;
  private pendingRequests = new Map<string, Promise<any>>();
  
  private readonly USER_CACHE_DURATION = 5 * 60 * 1000; // 5minute
  private readonly CHANNEL_MESSAGES_CACHE_DURATION = 2 * 60 * 1000; // 2minute
  private readonly CHANNEL_LIST_CACHE_DURATION = 30 * 1000; // 30Second
  
  // Get user information (with cache)
  async getUser(userId: number): Promise<User | null> {
    const cacheKey = `user-${userId}`;
    
    // Check the cache
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION) {
      return cached.data;
    }
    
    // Check if there are any requests in progress
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    try {
      const promise = userAPI.getUser(userId);
      this.pendingRequests.set(cacheKey, promise);
      
      const userData = await promise;
      
      // Cache results
      this.userCache.set(userId, {
        data: userData,
        timestamp: Date.now()
      });
      
      return userData;
    } catch (error) {
      console.error(`Get users ${userId} Information failed:`, error);
      return null;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  // batchGet usersinformation
  async getUsers(userIds: number[]): Promise<Map<number, User>> {
    const results = new Map<number, User>();
    const toFetch: number[] = [];
    
    // Check the cache, collect users who need to be obtainedID
    userIds.forEach(userId => {
      const cached = this.userCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION) {
        results.set(userId, cached.data);
      } else {
        toFetch.push(userId);
      }
    });
    
    // Bulk requests uncached user information (limits concurrency count)
    if (toFetch.length > 0) {
      const batchSize = 5;
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < toFetch.length; i += batchSize) {
        const batch = toFetch.slice(i, i + batchSize);
        const batchPromise = Promise.allSettled(
          batch.map(async userId => {
            const user = await this.getUser(userId);
            if (user) {
              results.set(userId, user);
            }
          })
        ).then(() => {});
        
        promises.push(batchPromise);
      }
      
      await Promise.all(promises);
    }
    
    return results;
  }
  
  // Get channel messages (with cache)
  async getChannelMessages(channelId: number): Promise<ChatMessage[] | null> {
    const cacheKey = `channel-messages-${channelId}`;
    
    // Check the cache
    const cached = this.channelMessagesCache.get(channelId);
    if (cached && Date.now() - cached.timestamp < this.CHANNEL_MESSAGES_CACHE_DURATION) {
      return cached.data;
    }
    
    // Check if there are any requests in progress
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    try {
      const promise = chatAPI.getChannelMessages(channelId);
      this.pendingRequests.set(cacheKey, promise);
      
      const messages = await promise;
      
      // Cache results
      if (messages) {
        this.channelMessagesCache.set(channelId, {
          data: messages,
          timestamp: Date.now()
        });
        return messages;
      }
      
      return [];
    } catch (error) {
      console.error(`Get the channel ${channelId} The message failed:`, error);
      return null;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  // Get the channelList (with cache)
  async getChannels(): Promise<ChatChannel[] | null> {
    const cacheKey = 'channel-list';
    
    // Check the cache
    if (this.channelListCache && Date.now() - this.channelListCache.timestamp < this.CHANNEL_LIST_CACHE_DURATION) {
      return this.channelListCache.data;
    }
    
    // Check if there are any requests in progress
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    try {
      const promise = chatAPI.getChannels();
      this.pendingRequests.set(cacheKey, promise);
      
      const channels = await promise;
      
      // Cache results
      if (channels) {
        this.channelListCache = {
          data: channels,
          timestamp: Date.now()
        };
        return channels;
      }
      
      return [];
    } catch (error) {
      console.error('Get the channelList failed:', error);
      return null;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  // Clear cache
  clearCache() {
    this.userCache.clear();
    this.channelMessagesCache.clear();
    this.channelListCache = null;
    this.pendingRequests.clear();
  }
  
  // Clear message cache for a specific channel (when there is a new message)
  invalidateChannelMessages(channelId: number) {
    this.channelMessagesCache.delete(channelId);
  }
  
  // Clear the channel list cache (when the channel list changes)
  invalidateChannelList() {
    this.channelListCache = null;
  }
  
  // Update user cache
  updateUserCache(userId: number, userData: User) {
    this.userCache.set(userId, {
      data: userData,
      timestamp: Date.now()
    });
  }

  // Get cached user information (synchronization method)
  getCachedUser(userId: number): User | null {
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  // Check if the user is in cache
  hasCachedUser(userId: number): boolean {
    const cached = this.userCache.get(userId);
    return !!cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION;
  }
}

// Export singleton instance
export const apiCache = new APICache();
