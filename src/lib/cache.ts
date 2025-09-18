import { redis, getCacheKey } from './redis'
import { prisma } from './db'

// Cache configuration
const CACHE_TTL = {
  TICKET_COUNT: 5, // 5 seconds for ticket counts (high freshness needed)
  EVENT_DATA: 600, // 10 minutes for event data
  USER_SESSION: 1800, // 30 minutes for user session data
  METRICS: 300 // 5 minutes for metrics
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  operations: number
}

class CacheManager {
  private stats = {
    hits: 0,
    misses: 0,
    operations: 0
  }

  // Get cached ticket count with fallback to database
  async getTicketCount(eventId: string): Promise<number> {
    const cacheKey = getCacheKey.ticketCount(eventId)
    this.stats.operations++

    try {
      const cached = await redis.get(cacheKey)
      
      if (cached !== null) {
        this.stats.hits++
        console.log(`Cache HIT: ticket count for event ${eventId}`)
        return parseInt(cached as string, 10)
      }
    } catch (error) {
      console.warn('Cache read failed for ticket count:', error)
    }

    // Cache miss - fetch from database
    this.stats.misses++
    console.log(`Cache MISS: fetching ticket count for event ${eventId} from database`)
    
    try {
      const count = await prisma.ticket.count({
        where: {
          eventId: eventId,
          status: 'ACTIVE'
        }
      })

      // Update cache
      await this.setTicketCount(eventId, count)
      return count
    } catch (error) {
      console.error('Failed to fetch ticket count from database:', error)
      return 0
    }
  }

  // Set ticket count in cache
  async setTicketCount(eventId: string, count: number): Promise<void> {
    const cacheKey = getCacheKey.ticketCount(eventId)
    
    try {
      await redis.set(cacheKey, count.toString(), { ex: CACHE_TTL.TICKET_COUNT })
      console.log(`Cached ticket count for event ${eventId}: ${count}`)
    } catch (error) {
      console.warn('Failed to cache ticket count:', error)
    }
  }

  // Get cached event data
  async getEventData(eventId: string): Promise<any> {
    const cacheKey = getCacheKey.eventData(eventId)
    this.stats.operations++

    try {
      const cached = await redis.get(cacheKey)
      
      if (cached !== null) {
        this.stats.hits++
        console.log(`Cache HIT: event data for ${eventId}`)
        return JSON.parse(cached as string)
      }
    } catch (error) {
      console.warn('Cache read failed for event data:', error)
    }

    // Cache miss - fetch from database
    this.stats.misses++
    console.log(`Cache MISS: fetching event data for ${eventId} from database`)
    
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          tickets: {
            select: {
              id: true,
              status: true
            }
          }
        }
      })

      if (event) {
        // Calculate additional metrics
        const eventWithMetrics = {
          ...event,
          ticketCount: event.tickets.length,
          availableTickets: event.quota - event.tickets.filter(t => t.status === 'ACTIVE').length,
          claimedTickets: event.tickets.filter(t => t.status === 'ACTIVE').length,
          usedTickets: event.tickets.filter(t => t.status === 'USED').length
        }

        // Update cache
        await this.setEventData(eventId, eventWithMetrics)
        return eventWithMetrics
      }

      return null
    } catch (error) {
      console.error('Failed to fetch event data from database:', error)
      return null
    }
  }

  // Set event data in cache
  async setEventData(eventId: string, data: any): Promise<void> {
    const cacheKey = getCacheKey.eventData(eventId)
    
    try {
      await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL.EVENT_DATA })
      console.log(`Cached event data for ${eventId}`)
    } catch (error) {
      console.warn('Failed to cache event data:', error)
    }
  }

  // Get cached user session
  async getUserSession(userId: string): Promise<any> {
    const cacheKey = getCacheKey.userSession(userId)
    this.stats.operations++

    try {
      const cached = await redis.get(cacheKey)
      
      if (cached !== null) {
        this.stats.hits++
        return JSON.parse(cached as string)
      }
    } catch (error) {
      console.warn('Cache read failed for user session:', error)
    }

    this.stats.misses++
    return null
  }

  // Set user session in cache
  async setUserSession(userId: string, sessionData: any): Promise<void> {
    const cacheKey = getCacheKey.userSession(userId)
    
    try {
      await redis.set(cacheKey, JSON.stringify(sessionData), { ex: CACHE_TTL.USER_SESSION })
    } catch (error) {
      console.warn('Failed to cache user session:', error)
    }
  }

  // Cache invalidation methods
  async invalidateTicketCount(eventId: string): Promise<void> {
    const cacheKey = getCacheKey.ticketCount(eventId)
    
    try {
      await redis.del(cacheKey)
      console.log(`Invalidated ticket count cache for event ${eventId}`)
    } catch (error) {
      console.warn('Failed to invalidate ticket count cache:', error)
    }
  }

  async invalidateEventData(eventId: string): Promise<void> {
    const cacheKey = getCacheKey.eventData(eventId)
    
    try {
      await redis.del(cacheKey)
      console.log(`Invalidated event data cache for ${eventId}`)
    } catch (error) {
      console.warn('Failed to invalidate event data cache:', error)
    }
  }

  async invalidateUserSession(userId: string): Promise<void> {
    const cacheKey = getCacheKey.userSession(userId)
    
    try {
      await redis.del(cacheKey)
      console.log(`Invalidated user session cache for ${userId}`)
    } catch (error) {
      console.warn('Failed to invalidate user session cache:', error)
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.operations > 0 ? (this.stats.hits / this.stats.operations) * 100 : 0,
      operations: this.stats.operations
    }
  }

  // Reset statistics
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, operations: 0 }
  }

  // Bulk cache warming for events
  async warmEventCache(eventIds: string[]): Promise<void> {
    console.log(`Warming cache for ${eventIds.length} events`)
    
    const promises = eventIds.map(async (eventId) => {
      try {
        await this.getEventData(eventId)
        await this.getTicketCount(eventId)
      } catch (error) {
        console.error(`Failed to warm cache for event ${eventId}:`, error)
      }
    })

    await Promise.allSettled(promises)
    console.log('Cache warming completed')
  }
}

export const cacheManager = new CacheManager()