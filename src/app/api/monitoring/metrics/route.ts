import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { monitoring } from '@/lib/monitoring'

// GET /api/monitoring/metrics - Get system performance and business metrics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admin access to monitoring metrics
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    const [performanceMetrics, businessMetrics, activeAlerts] = await Promise.all([
      monitoring.getPerformanceMetrics(),
      monitoring.getBusinessMetrics(),
      monitoring.getActiveAlerts()
    ])
    
    return NextResponse.json({
      success: true,
      data: {
        performance: performanceMetrics,
        business: businessMetrics,
        alerts: activeAlerts,
        timestamp: Date.now(),
        systemHealth: {
          overall: monitoring.calculateOverallHealth(performanceMetrics),
          redis: performanceMetrics.redis.connected,
          database: performanceMetrics.database.connectionCount > 0,
          queue: performanceMetrics.queue.failed < performanceMetrics.queue.completed * 0.1 // Less than 10% failure rate
        }
      }
    })
  } catch (error) {
    console.error('Monitoring metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to get monitoring metrics' },
      { status: 500 }
    )
  }
}

// POST /api/monitoring/metrics - Update business metrics (internal use)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { metric, value, operation = 'set' } = body
    
    // This would be called internally to update metrics
    // Add authentication/authorization for internal services
    
    return NextResponse.json({
      success: true,
      message: 'Metric updated successfully'
    })
  } catch (error) {
    console.error('Metric update error:', error)
    return NextResponse.json(
      { error: 'Failed to update metric' },
      { status: 500 }
    )
  }
}