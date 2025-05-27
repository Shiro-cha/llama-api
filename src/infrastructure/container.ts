import { ModelService } from "../application/services/model-service.js"
import { FileModelRepository } from "./repositories/file-model-repository.js"
import { HuggingFaceDownloader } from "./services/huggingface-downloader.js"
import { TransformersLoader } from "./services/transformers-loader.js"
import { ConfigManager } from "./config/app-config.js"
import { Logger } from "./logging/logger.js"
import { HealthMonitor } from "./monitoring/health-monitor.js"
import { ModelRegistry } from "./registries/model-registry.js"

export class Container {
  private static instance: Container
  private _modelService: ModelService | null = null

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  getModelService(): ModelService {
    if (!this._modelService) {
      const config = ConfigManager.getInstance().getConfig()
      const logger = Logger.getInstance()

      logger.info("Initializing ModelService", {
        modelsPath: config.models.basePath,
        maxConcurrentDownloads: config.models.maxConcurrentDownloads,
      })

      const repository = new FileModelRepository(config.models.basePath)
      const downloader = new HuggingFaceDownloader()
      const loader = new TransformersLoader()

      this._modelService = new ModelService(repository, downloader, loader)

      // Initialize health monitor
      HealthMonitor.getInstance(this._modelService)

      logger.info("ModelService initialized successfully")
    }
    return this._modelService
  }

  getConfig(): ConfigManager {
    return ConfigManager.getInstance()
  }

  getLogger(): Logger {
    return Logger.getInstance()
  }

  getModelRegistry(): ModelRegistry {
    return ModelRegistry.getInstance()
  }

  getHealthMonitor(): HealthMonitor {
    return HealthMonitor.getInstance(this.getModelService())
  }
}
