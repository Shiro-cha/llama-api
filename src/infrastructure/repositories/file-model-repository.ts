import type { ModelRepository } from "../../domain/repositories/model-repository.js"
import { Model } from "../../domain/entities/model.js"
import { ModelInfoBuilder } from "../../domain/value-objects/model-info.js"
import { promises as fs } from "fs"
import { join } from "path"
import { ModelRegistry } from "../registries/model-registry.js"
import { Logger } from "../logging/logger.js"

export class FileModelRepository implements ModelRepository {
  private modelsPath: string
  private registryPath: string

  constructor(basePath = "./models") {
    this.modelsPath = basePath
    this.registryPath = join(basePath, "registry.json")
    this.ensureDirectoryExists()
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.modelsPath, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  async getModel(name: string): Promise<Model | null> {
    const logger = Logger.getInstance()
    logger.info(`Getting model ${name}`)

    try {
      const registry = await this.loadRegistry()
      const modelData = registry[name]

      if (!modelData) {
        // Check if it's a known model and create it
        const knownModel = this.getKnownModel(name)
        if (knownModel) {
          await this.saveModel(knownModel)
          return knownModel
        }
        logger.warn(`Model ${name} not found`)
        return null
      }

      const modelInfo = new ModelInfoBuilder()
        .setName(modelData.info.name)
        .setHuggingFaceId(modelData.info.huggingFaceId)
        .setVersion(modelData.info.version)
        .setDescription(modelData.info.description)
        .setLocalPath(modelData.info.localPath)
        .setModelType(modelData.info.modelType)
        .setSizeGB(modelData.info.sizeGB)
        .setRequiredFiles(modelData.info.requiredFiles)
        .build()

      const model = new Model(modelInfo)

      // Restore status
      if (modelData.status) {
        switch (modelData.status) {
          case "downloaded":
            model.markDownloaded()
            break
          case "loaded":
            model.markLoaded()
            break
          case "error":
            model.markError(modelData.errorMessage || "Unknown error")
            break
        }
      }

      logger.info(`Model ${name} loaded successfully`)
      return model
    } catch (error) {
      logger.error(`Error loading model ${name}:`, error)
      return null
    }
  }

  async saveModel(model: Model): Promise<void> {
    const logger = Logger.getInstance()
    logger.info(`Saving model ${model.info.name}`)

    try {
      const registry = await this.loadRegistry()
      registry[model.info.name] = model.toJSON()
      await this.saveRegistry(registry)
      logger.info(`Model ${model.info.name} saved successfully`)
    } catch (error) {
      logger.error(`Error saving model ${model.info.name}:`, error)
      throw error
    }
  }

  async getAllModels(): Promise<Model[]> {
    const logger = Logger.getInstance()
    logger.info("Getting all models")

    try {
      const registry = await this.loadRegistry()
      const models: Model[] = []

      for (const [name, _] of Object.entries(registry)) {
        const model = await this.getModel(name)
        if (model) {
          models.push(model)
        }
      }

      logger.info(`Found ${models.length} models`)
      return models
    } catch (error) {
      logger.error("Error loading all models:", error)
      return []
    }
  }

  async deleteModel(name: string): Promise<boolean> {
    const logger = Logger.getInstance()
    logger.info(`Deleting model ${name}`)

    try {
      const registry = await this.loadRegistry()
      delete registry[name]
      await this.saveRegistry(registry)

      // Also delete model files
      const modelPath = join(this.modelsPath, name)
      try {
        await fs.rm(modelPath, { recursive: true, force: true })
      } catch (error) {
        // Model files might not exist
        logger.warn(`Model files for ${name} not found, skipping deletion`)
      }

      logger.info(`Model ${name} deleted successfully`)
      return true
    } catch (error) {
      logger.error(`Error deleting model ${name}:`, error)
      return false
    }
  }

  private async loadRegistry(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(this.registryPath, "utf-8")
      return JSON.parse(data)
    } catch (error) {
      return {}
    }
  }

  private async saveRegistry(registry: Record<string, any>): Promise<void> {
    await fs.writeFile(this.registryPath, JSON.stringify(registry, null, 2))
  }

  private getKnownModel(name: string): Model | null {
    const logger = Logger.getInstance()
    const registry = ModelRegistry.getInstance()

    const registryEntry = registry.getModel(name)
    if (!registryEntry) {
      logger.warn(`Model ${name} not found in registry`)
      return null
    }

    logger.info(`Creating model ${name} from registry`, {
      huggingFaceId: registryEntry.info.huggingFaceId,
      tags: registryEntry.tags,
    })

    return new Model(registryEntry.info)
  }
}
