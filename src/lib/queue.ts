import { prisma } from './db'
import { redis, getCacheKey } from './redis'
import { cacheManager } from './cache'
import { nanoid } from 'nanoid'\nimport { redis, getCacheKey } from './redis'

export interface QueueJobResult {
  success: boolean
  ticketCode?: string
  error?: string
  position?: number
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  totalProcessed: number
  averageProcessingTime: number
}

class TicketQueueManager {
  private processingInterval: NodeJS.Timeout | null = null
  private isProcessing = false
  private stats = {
    processed: 0,
    totalProcessingTime: 0
  }

  // Add user to queue for ticket claim
  async addToQueue(userId: string, eventId: string, priority = 0): Promise<QueueJobResult> {
    try {
      // Check if user already in queue for this event
      const existingEntry = await prisma.ticketQueue.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId
          }
        }
      })

      if (existingEntry) {
        if (existingEntry.status === 'COMPLETED') {
          return {
            success: false,
            error: 'You have already claimed a ticket for this event'
          }
        }
        
        if (existingEntry.status === 'PENDING' || existingEntry.status === 'PROCESSING') {
          const position = await this.getQueuePosition(userId, eventId)
          return {
            success: true,
            position,
            error: 'You are already in the queue for this event'
          }
        }
      }

      // Add to queue
      const queueEntry = await prisma.ticketQueue.create({
        data: {
          userId,
          eventId,
          priority,
          status: 'PENDING'
        }
      })

      const position = await this.getQueuePosition(userId, eventId)
      
      // Cache queue position
      await redis.set(
        getCacheKey.queuePosition(userId, eventId),
        position,
        { ex: 30 } // 30 seconds cache
      )

      console.log(`Added user ${userId} to queue for event ${eventId} at position ${position}`)
      
      return {
        success: true,
        position
      }
    } catch (error) {
      console.error('Failed to add user to queue:', error)
      return {
        success: false,
        error: 'Failed to join the queue. Please try again.'
      }
    }
  }

  // Get user's position in queue
  async getQueuePosition(userId: string, eventId: string): Promise<number> {
    try {
      // Check cache first
      const cached = await redis.get(getCacheKey.queuePosition(userId, eventId))
      if (cached !== null) {
        return parseInt(cached as string, 10)
      }

      // Count pending entries before this user
      const userEntry = await prisma.ticketQueue.findUnique({
        where: {
          userId_eventId: { userId, eventId }
        }
      })

      if (!userEntry) return -1

      const position = await prisma.ticketQueue.count({
        where: {
          eventId,
          status: 'PENDING',
          queuedAt: {
            lt: userEntry.queuedAt
          }
        }
      })

      return position + 1 // Position is 1-indexed
    } catch (error) {
      console.error('Failed to get queue position:', error)
      return -1
    }
  }

  // Start queue processing (called on server start)
  startProcessing(): void {
    if (this.processingInterval) return

    console.log('🚀 Starting ticket queue processing...')
    
    // Process every 2 seconds as specified
    this.processingInterval = setInterval(() => {
      this.processBatch()
    }, 2000)
  }

  // Stop queue processing
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('⏹️ Stopped ticket queue processing')
    }
  }

  // Process a batch of queue entries (10 per batch as specified)
  private async processBatch(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    const startTime = Date.now()
    
    try {
      // Get up to 10 pending entries ordered by priority and queue time
      const pendingEntries = await prisma.ticketQueue.findMany({
        where: {
          status: 'PENDING'
        },
        orderBy: [
          { priority: 'desc' },
          { queuedAt: 'asc' }
        ],
        take: 10,
        include: {
          user: true,
          event: true
        }
      })

      if (pendingEntries.length === 0) {
        this.isProcessing = false
        return
      }

      console.log(`Processing ${pendingEntries.length} queue entries...`)

      // Process entries in parallel with proper error handling
      const promises = pendingEntries.map(entry => 
        this.processQueueEntry(entry).catch(error => {
          console.error(`Failed to process queue entry ${entry.id}:`, error)
          return this.markEntryFailed(entry.id, error.message)
        })
      )

      await Promise.allSettled(promises)
      
      // Update processing stats
      const processingTime = Date.now() - startTime
      this.stats.processed += pendingEntries.length
      this.stats.totalProcessingTime += processingTime
      
      console.log(`Processed ${pendingEntries.length} entries in ${processingTime}ms`)
      
    } catch (error) {
      console.error('Batch processing failed:', error)
    } finally {
      this.isProcessing = false
    }
  }

  // Process individual queue entry
  private async processQueueEntry(entry: any): Promise<void> {
    try {
      // Mark as processing
      await prisma.ticketQueue.update({
        where: { id: entry.id },
        data: { 
          status: 'PROCESSING',
          processedAt: new Date()
        }
      })

      // Check if tickets are still available
      const ticketCount = await cacheManager.getTicketCount(entry.eventId)
      const availableTickets = entry.event.quota - ticketCount
      
      if (availableTickets <= 0) {
        throw new Error('No tickets available')
      }

      // Generate unique ticket code
      const ticketCode = `TK-${nanoid(8).toUpperCase()}`
      
      // Create ticket with atomic transaction and row-level locking
      const result = await prisma.$transaction(async (tx) => {
        // Lock the event row to prevent concurrent modifications
        const lockedEvent = await tx.event.findFirst({
          where: { id: entry.eventId },
          // This ensures we have the latest data with row-level locking
        })
        
        if (!lockedEvent || !lockedEvent.isActive) {
          throw new Error('Event not found or inactive')
        }

        // Count current tickets with SELECT FOR UPDATE semantics
        const currentTicketCount = await tx.ticket.count({
          where: {
            eventId: entry.eventId,
            status: 'ACTIVE'
          }
        })
        
        // Atomic quota check
        if (currentTicketCount >= lockedEvent.quota) {
          throw new Error('Event is fully booked')
        }

        // Find available batch with locking
        let batch = await tx.ticket_batches.findFirst({
          where: {
            isActive: true,
            available: { gt: 0 }
          },
          orderBy: {
            available: 'desc'
          }
        })

        if (!batch) {
          // Create default batch atomically
          batch = await tx.ticket_batches.create({
            data: {
              name: `Batch-${Date.now()}`,
              quota: lockedEvent.quota,
              available: Math.max(0, lockedEvent.quota - currentTicketCount - 1),
              startDate: new Date(),
              endDate: lockedEvent.eventDate,
              isActive: true
            }
          })
        }

        // Atomic ticket creation
        const ticket = await tx.ticket.create({
          data: {
            ticketCode,
            userId: entry.userId,
            eventId: entry.eventId,
            batchId: batch.id,
            status: 'ACTIVE'
          }
        })

        // Atomic batch update
        await tx.ticket_batches.update({
          where: { id: batch.id },
          data: {
            available: {
              decrement: 1
            }
          }
        })

        // Atomic queue entry completion
        await tx.ticketQueue.update({
          where: { id: entry.id },
          data: {
            status: 'COMPLETED',
            processedAt: new Date()
          }
        })

        return ticket
      }, {
        timeout: 10000, // 10 second timeout
        isolationLevel: 'Serializable' // Highest isolation level
      })

      // Invalidate relevant caches
      await cacheManager.invalidateTicketCount(entry.eventId)
      await cacheManager.invalidateEventData(entry.eventId)
      
      console.log(`✅ Successfully created ticket ${ticketCode} for user ${entry.userId}`)
      
    } catch (error) {
      await this.markEntryFailed(entry.id, error.message)
      throw error
    }
  }

  // Mark queue entry as failed with retry logic
  private async markEntryFailed(entryId: string, errorMessage: string): Promise<void> {
    try {
      const entry = await prisma.ticketQueue.findUnique({
        where: { id: entryId }
      })

      if (!entry) return

      const newAttempts = entry.attempts + 1
      const maxRetries = 3

      if (newAttempts < maxRetries) {
        // Retry - reset to pending with increased attempts
        await prisma.ticketQueue.update({
          where: { id: entryId },
          data: {
            status: 'PENDING',
            attempts: newAttempts,
            errorMsg: errorMessage,
            processedAt: new Date()
          }
        })
        console.log(`Retrying queue entry ${entryId} (attempt ${newAttempts}/${maxRetries})`)
      } else {
        // Max retries reached - mark as failed
        await prisma.ticketQueue.update({
          where: { id: entryId },
          data: {
            status: 'FAILED',
            attempts: newAttempts,
            errorMsg: errorMessage,
            processedAt: new Date()
          }
        })
        console.error(`❌ Queue entry ${entryId} failed permanently: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Failed to mark entry as failed:', error)
    }
  }

  // Get queue statistics
  async getQueueStats(): Promise<QueueStats> {
    try {
      const [pending, processing, completed, failed] = await Promise.all([
        prisma.ticketQueue.count({ where: { status: 'PENDING' } }),
        prisma.ticketQueue.count({ where: { status: 'PROCESSING' } }),
        prisma.ticketQueue.count({ where: { status: 'COMPLETED' } }),
        prisma.ticketQueue.count({ where: { status: 'FAILED' } })
      ])

      return {
        pending,
        processing,
        completed,
        failed,
        totalProcessed: this.stats.processed,
        averageProcessingTime: this.stats.processed > 0 
          ? this.stats.totalProcessingTime / this.stats.processed 
          : 0
      }
    } catch (error) {
      console.error('Failed to get queue stats:', error)
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        totalProcessed: 0,
        averageProcessingTime: 0
      }
    }
  }

  // Cleanup completed jobs older than 1 hour
  async cleanupCompletedJobs(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      
      const result = await prisma.ticketQueue.deleteMany({
        where: {
          status: 'COMPLETED',
          processedAt: {
            lt: oneHourAgo
          }
        }
      })

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} completed queue entries`)
      }
    } catch (error) {
      console.error('Failed to cleanup completed jobs:', error)
    }
  }

  // Get estimated waiting time for a user
  async getEstimatedWaitTime(userId: string, eventId: string): Promise<number> {
    try {
      const position = await this.getQueuePosition(userId, eventId)
      if (position <= 0) return 0

      // Estimate based on average processing time and batch size
      const avgProcessingTime = this.stats.processed > 0 
        ? this.stats.totalProcessingTime / this.stats.processed 
        : 5000 // Default 5 seconds per batch
      
      const batchSize = 10
      const batchesAhead = Math.ceil(position / batchSize)
      const processingInterval = 2000 // 2 seconds between batches
      
      return (batchesAhead * processingInterval) + (avgProcessingTime * batchesAhead)
    } catch (error) {
      console.error('Failed to calculate wait time:', error)
      return 0
    }
  }
}

export const ticketQueue = new TicketQueueManager()