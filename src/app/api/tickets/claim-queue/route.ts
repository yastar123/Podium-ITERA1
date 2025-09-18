import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ticketQueue } from '@/lib/queue'
import { rateLimitUserTicketClaim } from '@/lib/rateLimit'
import { cacheManager } from '@/lib/cache'
import { monitoring } from '@/lib/monitoring'

// POST /api/tickets/claim-queue - Add user to ticket claim queue
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      monitoring.recordApiCall('/api/tickets/claim-queue', false, 'Unauthorized')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    const { eventId, priority = 0 } = body
    
    if (!eventId) {
      monitoring.recordApiCall('/api/tickets/claim-queue', false, 'Missing eventId')
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }
    
    // Apply user-specific rate limiting (3 attempts per minute)
    const rateLimitResult = await rateLimitUserTicketClaim(session.user.id)
    
    if (!rateLimitResult.success) {
      monitoring.recordApiCall('/api/tickets/claim-queue', false, 'Rate limited')
      return NextResponse.json(
        {
          error: rateLimitResult.error,
          retryAfter: rateLimitResult.resetTime ? 
            Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000) : 60
        },
        { status: 429 }
      )
    }
    
    // Check if event exists and has available tickets
    const eventData = await cacheManager.getEventData(eventId)
    
    if (!eventData) {
      monitoring.recordApiCall('/api/tickets/claim-queue', false, 'Event not found')
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    if (!eventData.isActive) {
      monitoring.recordApiCall('/api/tickets/claim-queue', false, 'Event inactive')
      return NextResponse.json(
        { error: 'Event is not active' },
        { status: 400 }
      )
    }
    
    if (eventData.availableTickets <= 0) {
      monitoring.recordApiCall('/api/tickets/claim-queue', false, 'No tickets available')
      return NextResponse.json(
        { error: 'No tickets available for this event' },
        { status: 400 }
      )
    }
    
    // Add user to queue
    const queueResult = await ticketQueue.addToQueue(session.user.id, eventId, priority)
    
    if (queueResult.success) {
      // Update business metrics
      await Promise.all([
        monitoring.recordApiCall('/api/tickets/claim-queue', true),
        // Increment queue metrics in Redis
        // This would be enhanced with more detailed metrics tracking
      ])
      
      const duration = Date.now() - startTime
      monitoring.recordResponseTime('/api/tickets/claim-queue', duration)
      
      return NextResponse.json({
        success: true,
        message: queueResult.error || 'Successfully added to queue',
        data: {
          position: queueResult.position,
          estimatedWaitTime: await ticketQueue.getEstimatedWaitTime(session.user.id, eventId)
        }
      })
    } else {
      monitoring.recordApiCall('/api/tickets/claim-queue', false, queueResult.error)
      return NextResponse.json(
        { error: queueResult.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Ticket claim queue error:', error)
    monitoring.recordApiCall('/api/tickets/claim-queue', false, error.message)
    
    const duration = Date.now() - startTime
    monitoring.recordResponseTime('/api/tickets/claim-queue', duration)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}