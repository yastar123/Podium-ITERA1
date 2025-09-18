import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ticketQueue } from '@/lib/queue'
import { rateLimitUserTicketClaim } from '@/lib/rateLimit'

// GET /api/queue/status - Get queue position and wait time
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      )
    }
    
    const [position, waitTime, queueStats] = await Promise.all([
      ticketQueue.getQueuePosition(session.user.id, eventId),
      ticketQueue.getEstimatedWaitTime(session.user.id, eventId),
      ticketQueue.getQueueStats()
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        position,
        estimatedWaitTime: waitTime,
        inQueue: position > 0,
        queueStats
      }
    })
  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}