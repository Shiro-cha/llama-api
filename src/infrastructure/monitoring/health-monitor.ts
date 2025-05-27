import type { ModelService } from "../../application/services/model-service.js"
import { Logger } from "../logging/logger.js"

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  models: {
    loaded: number
    total: number
    current?: string
  }
  lastError?: string
}

export class HealthMonitor {
  private static instance: HealthMonitor
  private startTime: number
  private lastError?: string
  private logger: Logger

  private constructor(private modelService: ModelService) {
    this.startTime = Date.now()
    this.logger = Logger.getInstance()
  }

  static getInstance(modelService?: ModelService): HealthMonitor {
    if (!HealthMonitor.instance && modelService) {
      HealthMonitor.instance = new HealthMonitor(modelService)
    }
    return HealthMonitor.instance
  }

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const memoryUsage = process.memoryUsage()
      const modelStatus = await this.modelService.getModelStatus()
      const allModels = await this.modelService.getAllModels()

      const loadedModels = allModels.filter((m) => m.isReady).length

      const status: HealthStatus = {
        status: this.determineOverallStatus(memoryUsage, loadedModels),
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        models: {
          loaded: loadedModels,
          total: allModels.length,
          current: modelStatus.model || undefined,
        },
        lastError: this.lastError,
      }

      this.logger.debug("Health status checked", { status })
      return status
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown error"
      this.logger.error("Health check failed", {}, error instanceof Error ? error : undefined)

      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        memory: { used: 0, total: 0, percentage: 0 },
        models: { loaded: 0, total: 0 },
        lastError: this.lastError,
      }
    }
  }

  private determineOverallStatus(
    memoryUsage: NodeJS.MemoryUsage,
    loadedModels: number,
  ): "healthy" | "degraded" | "unhealthy" {
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100

    if (this.lastError) {
      return "unhealthy"
    }

    if (memoryPercentage > 90) {
      return "degraded"
    }

    if (loadedModels === 0) {
      return "degraded"
    }

    return "healthy"
  }

  recordError(error: string): void {
    this.lastError = error
    this.logger.error("Error recorded in health monitor", { error })
  }

  clearError(): void {
    this.lastError = undefined
    this.logger.info("Health monitor error cleared")
  }
}
