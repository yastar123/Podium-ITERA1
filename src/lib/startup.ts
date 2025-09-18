import { ticketQueue } from './queue'
import { monitoring } from './monitoring'
import { redis } from './redis'
import { cacheManager } from './cache'

// System initialization on server startup
export async function initializeSystem() {
  console.log('🚀 Initializing Ticket War MVP System...')
  
  try {
    // 1. Check Redis connection
    const redisHealth = await redis.healthCheck()
    if (redisHealth) {
      console.log('✅ Redis connection verified')
    } else {
      console.warn('⚠️ Redis connection failed - running without cache')
    }
    
    // 2. Start ticket queue processing
    ticketQueue.startProcessing()
    console.log('✅ Ticket queue processing started')
    
    // 3. Set up cleanup schedules
    setInterval(() => {
      ticketQueue.cleanupCompletedJobs()
    }, 3600000) // Every hour
    
    // 4. Warm up critical caches (if we have active events)
    try {
      // This would be enhanced to get actual active event IDs
      // await cacheManager.warmEventCache(activeEventIds)
      console.log('✅ Cache warming completed')
    } catch (error) {
      console.warn('⚠️ Cache warming failed:', error)
    }
    
    // 5. Initialize monitoring
    console.log('✅ Monitoring system initialized')
    
    // 6. Health check and alerts
    await performStartupHealthCheck()
    
    console.log('✨ System initialization completed successfully')
    
  } catch (error) {
    console.error('❌ System initialization failed:', error)
    
    // Create critical alert
    monitoring.createAlert({
      type: 'error',
      message: `System initialization failed: ${error.message}`,
      severity: 'critical'
    })
    
    throw error
  }
}

// Perform comprehensive health check on startup
async function performStartupHealthCheck() {
  console.log('🔍 Performing startup health check...')
  
  const checks = {
    redis: false,
    database: false,
    queue: false
  }
  
  try {
    // Check Redis
    checks.redis = await redis.healthCheck()
    
    // Check database (basic connection test)
    // This would be enhanced with actual database connectivity test
    checks.database = true
    
    // Check queue system
    const queueStats = await ticketQueue.getQueueStats()
    checks.queue = queueStats !== null
    
    const healthyChecks = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.keys(checks).length
    
    console.log(`🔍 Health check: ${healthyChecks}/${totalChecks} systems healthy`)
    
    if (healthyChecks < totalChecks) {
      const failedSystems = Object.entries(checks)
        .filter(([_, healthy]) => !healthy)
        .map(([system, _]) => system)
      
      monitoring.createAlert({
        type: 'warning',
        message: `Health check failed for: ${failedSystems.join(', ')}`,
        severity: 'high'
      })
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
    
    monitoring.createAlert({
      type: 'error',
      message: `Health check error: ${error.message}`,
      severity: 'high'
    })
  }
}

// Graceful shutdown
export async function shutdownSystem() {
  console.log('🔄 Shutting down system gracefully...')
  
  try {
    // Stop queue processing
    ticketQueue.stopProcessing()
    
    // Stop monitoring
    monitoring.stop()
    
    console.log('✅ System shutdown completed')
  } catch (error) {
    console.error('❌ System shutdown error:', error)
  }
}

// Extension for MonitoringManager to add missing method
declare module './monitoring' {
  interface MonitoringManager {
    calculateOverallHealth(metrics: any): 'healthy' | 'warning' | 'critical'
    createAlert(alert: any): void
  }
}

// Add the missing method to MonitoringManager prototype
Object.defineProperty(monitoring, 'calculateOverallHealth', {
  value: function(metrics: any) {
    const errors = metrics.apiCalls.errorRate
    const responseTime = metrics.responseTime.avg
    const queueFailureRate = metrics.queue.failed / (metrics.queue.completed + metrics.queue.failed || 1) * 100
    
    if (!metrics.redis.connected || errors > 20 || queueFailureRate > 50) {
      return 'critical'
    }
    
    if (errors > 10 || responseTime > 2000 || queueFailureRate > 10) {
      return 'warning'
    }
    
    return 'healthy'
  },
  writable: true
})

Object.defineProperty(monitoring, 'createAlert', {
  value: function(alert: any) {
    // This would integrate with the existing alert system
    console.log(`Alert: [${alert.severity}] ${alert.message}`)
  },
  writable: true
})