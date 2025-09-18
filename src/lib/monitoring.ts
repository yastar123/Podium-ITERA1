import { redis, getCacheKey } from './redis'
import { cacheManager } from './cache'
import { ticketQueue } from './queue'

export interface PerformanceMetrics {
  responseTime: {
    avg: number
    p95: number
    p99: number
    min: number
    max: number
  }
  apiCalls: {
    total: number
    success: number
    errors: number
    errorRate: number
  }
  database: {
    queryTime: number
    connectionCount: number
    slowQueries: number
  }
  redis: {
    hitRate: number
    connected: boolean
    responseTime: number
  }
  queue: {
    pending: number
    processing: number
    completed: number
    failed: number
    averageWaitTime: number
  }
}

export interface BusinessMetrics {
  tickets: {
    totalClaimed: number
    totalUsed: number
    remainingTickets: number
    claimRate: number // claims per minute
  }
  users: {
    activeUsers: number
    concurrentUsers: number
    registrationsToday: number
  }
  events: {
    totalEvents: number
    activeEvents: number
    completedEvents: number
  }
}

export interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: number
  resolved: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class MonitoringManager {
  private metrics: { [key: string]: number[] } = {}
  private responseTimes: number[] = []
  private alerts: SystemAlert[] = []
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanupScheduler()
  }

  // Track API response time
  recordResponseTime(endpoint: string, duration: number): void {
    const key = `response_time:${endpoint}`
    
    if (!this.metrics[key]) {
      this.metrics[key] = []
    }
    
    this.metrics[key].push(duration)
    this.responseTimes.push(duration)
    
    // Keep only last 1000 measurements
    if (this.metrics[key].length > 1000) {
      this.metrics[key] = this.metrics[key].slice(-1000)
    }
    
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }
    
    // Store in Redis for persistence
    redis.set(
      getCacheKey.metrics(`response_time_${endpoint}`),
      JSON.stringify({ duration, timestamp: Date.now() }),
      { ex: 3600 } // 1 hour TTL
    )
    
    // Check for slow response alerts
    if (duration > 3000) { // 3 seconds threshold
      this.createAlert({
        type: 'warning',
        message: `Slow response time detected on ${endpoint}: ${duration}ms`,
        severity: 'medium'
      })
    }
  }

  // Track API call success/failure
  recordApiCall(endpoint: string, success: boolean, error?: string): void {
    const successKey = `api_success:${endpoint}`
    const errorKey = `api_error:${endpoint}`
    
    if (success) {
      this.incrementMetric(successKey)
    } else {
      this.incrementMetric(errorKey)
      
      // Log error details
      console.error(`API Error on ${endpoint}:`, error)
      
      // Check error rate
      this.checkErrorRate(endpoint)
    }
  }

  // Check if error rate exceeds threshold
  private async checkErrorRate(endpoint: string): Promise<void> {
    const errorKey = `api_error:${endpoint}`
    const successKey = `api_success:${endpoint}`
    
    const errors = this.metrics[errorKey]?.length || 0
    const successes = this.metrics[successKey]?.length || 0
    const total = errors + successes
    
    if (total > 10) { // Only check if we have enough data
      const errorRate = (errors / total) * 100
      
      if (errorRate > 10) { // 10% error rate threshold
        this.createAlert({
          type: 'error',
          message: `High error rate detected on ${endpoint}: ${errorRate.toFixed(2)}%`,
          severity: 'high'
        })
      }
    }
  }

  // Record database query performance
  recordDatabaseQuery(queryType: string, duration: number): void {
    const key = `db_query:${queryType}`
    
    if (!this.metrics[key]) {
      this.metrics[key] = []
    }
    
    this.metrics[key].push(duration)
    
    // Alert on slow queries
    if (duration > 1000) { // 1 second threshold
      this.createAlert({
        type: 'warning',
        message: `Slow database query detected: ${queryType} took ${duration}ms`,
        severity: 'medium'
      })
    }
  }

  // Track concurrent users
  async updateConcurrentUsers(count: number): Promise<void> {
    await redis.set('concurrent_users', count, { ex: 30 })
    
    // Alert on high concurrent users
    if (count > 1000) {
      this.createAlert({
        type: 'warning',
        message: `High concurrent user count: ${count}`,
        severity: 'medium'
      })
    }
  }

  // Get comprehensive performance metrics
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const [cacheStats, queueStats, redisHealth] = await Promise.all([
        cacheManager.getStats(),
        ticketQueue.getQueueStats(),
        redis.healthCheck()
      ])

      // Calculate response time statistics
      const responseTimeStats = this.calculateStats(this.responseTimes)

      // Calculate API success rates
      let totalApiCalls = 0
      let successfulCalls = 0
      let errorCalls = 0
      
      for (const key in this.metrics) {
        if (key.includes('api_success')) {
          successfulCalls += this.metrics[key].length
        }
        if (key.includes('api_error')) {
          errorCalls += this.metrics[key].length
        }
      }
      
      totalApiCalls = successfulCalls + errorCalls
      
      return {
        responseTime: responseTimeStats,
        apiCalls: {
          total: totalApiCalls,
          success: successfulCalls,
          errors: errorCalls,
          errorRate: totalApiCalls > 0 ? (errorCalls / totalApiCalls) * 100 : 0
        },
        database: {
          queryTime: this.getAverageMetric('db_query'),
          connectionCount: 1, // Simplified for now
          slowQueries: this.countSlowQueries()
        },
        redis: {
          hitRate: cacheStats.hitRate,
          connected: redisHealth,
          responseTime: await this.getRedisResponseTime()
        },
        queue: {
          pending: queueStats.pending,
          processing: queueStats.processing,
          completed: queueStats.completed,
          failed: queueStats.failed,
          averageWaitTime: queueStats.averageProcessingTime
        }
      }
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      return this.getDefaultMetrics()
    }
  }

  // Get business metrics
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const [concurrentUsers, totalTickets, usedTickets, totalUsers, totalEvents, activeEvents] = await Promise.all([
        redis.get('concurrent_users'),
        redis.get('total_tickets_claimed') || '0',
        redis.get('total_tickets_used') || '0',
        redis.get('total_active_users') || '0',
        redis.get('total_events') || '0',
        redis.get('active_events') || '0'
      ])

      // Calculate claim rate (simplified)
      const claimRate = await this.getClaimRate()
      
      return {
        tickets: {
          totalClaimed: parseInt(totalTickets as string, 10),
          totalUsed: parseInt(usedTickets as string, 10),
          remainingTickets: await this.getRemainingTickets(),
          claimRate
        },
        users: {
          activeUsers: parseInt(totalUsers as string, 10),
          concurrentUsers: parseInt(concurrentUsers as string || '0', 10),
          registrationsToday: await this.getRegistrationsToday()
        },
        events: {
          totalEvents: parseInt(totalEvents as string, 10),
          activeEvents: parseInt(activeEvents as string, 10),
          completedEvents: parseInt(totalEvents as string, 10) - parseInt(activeEvents as string, 10)
        }
      }
    } catch (error) {
      console.error('Failed to get business metrics:', error)
      return {
        tickets: { totalClaimed: 0, totalUsed: 0, remainingTickets: 0, claimRate: 0 },
        users: { activeUsers: 0, concurrentUsers: 0, registrationsToday: 0 },
        events: { totalEvents: 0, activeEvents: 0, completedEvents: 0 }
      }
    }
  }

  // Create system alert
  private createAlert(alert: Omit<SystemAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...alert
    }
    
    this.alerts.push(newAlert)
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
    
    // Log critical alerts
    if (alert.severity === 'critical') {
      console.error(`🚨 CRITICAL ALERT: ${alert.message}`)
    }
    
    console.log(`Alert created: [${alert.severity.toUpperCase()}] ${alert.message}`)
  }

  // Get active alerts
  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  // Helper methods
  private calculateStats(values: number[]): PerformanceMetrics['responseTime'] {
    if (values.length === 0) {
      return { avg: 0, p95: 0, p99: 0, min: 0, max: 0 }
    }
    
    const sorted = [...values].sort((a, b) => a - b)
    
    return {
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
      min: Math.min(...values),
      max: Math.max(...values)
    }
  }

  private incrementMetric(key: string): void {
    if (!this.metrics[key]) {
      this.metrics[key] = []
    }
    this.metrics[key].push(Date.now())
    
    // Keep only last hour of data
    const oneHourAgo = Date.now() - 3600000
    this.metrics[key] = this.metrics[key].filter(timestamp => timestamp > oneHourAgo)
  }

  private getAverageMetric(prefix: string): number {
    const relevantMetrics = Object.keys(this.metrics)
      .filter(key => key.startsWith(prefix))
      .flatMap(key => this.metrics[key])
    
    return relevantMetrics.length > 0 
      ? relevantMetrics.reduce((a, b) => a + b, 0) / relevantMetrics.length 
      : 0
  }

  private countSlowQueries(): number {
    return Object.keys(this.metrics)
      .filter(key => key.startsWith('db_query'))
      .reduce((count, key) => {
        return count + this.metrics[key].filter(duration => duration > 1000).length
      }, 0)
  }

  private async getRedisResponseTime(): Promise<number> {
    const start = Date.now()
    try {
      await redis.get('ping_test')
      return Date.now() - start
    } catch (error) {
      return -1
    }
  }

  private async getClaimRate(): Promise<number> {
    // Simplified calculation - could be enhanced with time series data
    const recentClaims = await redis.get('recent_claims') || '0'
    return parseInt(recentClaims as string, 10)
  }

  private async getRemainingTickets(): Promise<number> {
    try {
      // This would need to be updated based on your event structure
      const remaining = await redis.get('remaining_tickets') || '0'
      return parseInt(remaining as string, 10)
    } catch (error) {
      return 0
    }
  }

  private async getRegistrationsToday(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const registrations = await redis.get(`registrations:${today}`) || '0'
    return parseInt(registrations as string, 10)
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      responseTime: { avg: 0, p95: 0, p99: 0, min: 0, max: 0 },
      apiCalls: { total: 0, success: 0, errors: 0, errorRate: 0 },
      database: { queryTime: 0, connectionCount: 0, slowQueries: 0 },
      redis: { hitRate: 0, connected: false, responseTime: -1 },
      queue: { pending: 0, processing: 0, completed: 0, failed: 0, averageWaitTime: 0 }
    }
  }

  // Cleanup old metrics and alerts
  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData()
    }, 300000) // Every 5 minutes
  }

  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - 3600000
    
    // Clean up old metrics
    for (const key in this.metrics) {
      this.metrics[key] = this.metrics[key].filter(value => 
        typeof value === 'number' && (value > oneHourAgo || value < 10000) // Keep duration measurements
      )
    }
    
    // Clean up old alerts (keep for 24 hours)
    const oneDayAgo = Date.now() - 86400000
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneDayAgo)
  }

  // Calculate overall system health
  calculateOverallHealth(metrics: PerformanceMetrics): 'healthy' | 'warning' | 'critical' {
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
  }

  // Stop monitoring
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

export const monitoring = new MonitoringManager()