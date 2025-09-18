import { Redis } from '@upstash/redis'

// Enhanced Redis connection with error handling and graceful degradation
class RedisManager {
  private client: Redis | null = null
  private isConnected: boolean = false
  
  constructor() {
    this.initializeConnection()
  }

  private initializeConnection() {
    try {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.warn('⚠️ Redis credentials missing - running without Redis caching')
        return
      }

      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        retry: {
          retries: 3,
          backoff: (retryCount) => Math.exp(retryCount) * 50, // exponential backoff
        },
      })
      
      this.isConnected = true
      console.log('✅ Redis connection initialized successfully')
    } catch (error) {
      console.error('❌ Redis connection failed:', error)
      this.isConnected = false
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false
    
    try {
      const result = await this.client.ping()
      this.isConnected = result === 'PONG'
      return this.isConnected
    } catch (error) {
      console.error('Redis health check failed:', error)
      this.isConnected = false
      return false
    }
  }

  async get(key: string): Promise<any> {
    if (!this.client || !this.isConnected) return null
    
    try {
      return await this.client.get(key)
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<boolean> {
    if (!this.client || !this.isConnected) return false
    
    try {
      await this.client.set(key, value, options)
      return true
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      return false
    }
  }

  async incr(key: string): Promise<number | null> {
    if (!this.client || !this.isConnected) return null
    
    try {
      return await this.client.incr(key)
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error)
      return null
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client || !this.isConnected) return false
    
    try {
      await this.client.expire(key, seconds)
      return true
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error)
      return false
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false
    
    try {
      await this.client.del(key)
      return true
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error)
      return false
    }
  }

  getStatus(): { connected: boolean; client: boolean } {
    return {
      connected: this.isConnected,
      client: !!this.client
    }
  }
}

export const redis = new RedisManager()

// Helper function for cache keys
export const getCacheKey = {
  ticketCount: (eventId: string) => `ticket_count:${eventId}`,
  eventData: (eventId: string) => `event_data:${eventId}`,
  userSession: (userId: string) => `user_session:${userId}`,
  rateLimitUser: (userId: string) => `rate_limit_user:${userId}`,
  rateLimitIP: (ip: string) => `rate_limit_ip:${ip}`,
  queuePosition: (userId: string, eventId: string) => `queue_pos:${userId}:${eventId}`,
  metrics: (metric: string) => `metrics:${metric}:${Date.now()}`,
}