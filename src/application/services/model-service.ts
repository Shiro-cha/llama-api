import type { Model } from "../../domain/entities/model.js"
import type { ModelRepository } from "../../domain/repositories/model-repository.js"
import type { ModelDownloader } from "../../domain/services/model-downloader.js"
import type { ModelLoader } from "../../domain/services/model-loader.js"
import type { GenerationRequest, GenerationResponse } from "../../domain/value-objects/generation-request.js"
import { ModelStatus } from "../../domain/value-objects/model-status.js"

export interface SetupModelResult {
  success: boolean
  model?: string
  status?: ModelStatus
  error?: string
}

export interface GenerationResult {
  success: boolean
  response?: GenerationResponse
  error?: string
}

export class ModelService {
  private currentModel: Model | null = null

  constructor(
    private repository: ModelRepository,
    private downloader: ModelDownloader,
    private loader: ModelLoader,
  ) {}

  async setupModel(
    modelName: string,
    onProgress?: (progress: number, stage: string) => void,
  ): Promise<SetupModelResult> {
    try {
      onProgress?.(0, "Initializing...")

      // Get or create model
      const model = await this.repository.getModel(modelName)
      if (!model) {
        return { success: false, error: `Model ${modelName} not found in registry` }
      }

      // Check if already loaded
      if (model.isReady && this.loader.isModelLoaded(modelName)) {
        this.currentModel = model
        return { success: true, model: modelName, status: model.status }
      }

      // Download if needed
      if (model.status === ModelStatus.NOT_DOWNLOADED) {
        onProgress?.(10, "Downloading model...")
        model.markDownloading()
        await this.repository.saveModel(model)

        const downloadSuccess = await this.downloader.download(model.info, (progress) =>
          onProgress?.(10 + progress * 0.6, "Downloading model..."),
        )

        if (!downloadSuccess) {
          model.markError("Download failed")
          await this.repository.saveModel(model)
          return { success: false, error: "Download failed" }
        }

        model.markDownloaded()
        await this.repository.saveModel(model)
      }

      // Load model
      if (model.status === ModelStatus.DOWNLOADED) {
        onProgress?.(70, "Loading model into memory...")
        model.markLoading()
        await this.repository.saveModel(model)

        const loadSuccess = await this.loader.loadModel(model)
        if (!loadSuccess) {
          model.markError("Loading failed")
          await this.repository.saveModel(model)
          return { success: false, error: "Loading failed" }
        }

        model.markLoaded()
        this.currentModel = model
        await this.repository.saveModel(model)
      }

      onProgress?.(100, "Model ready!")
      return { success: true, model: modelName, status: model.status }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      return { success: false, error: errorMessage }
    }
  }

  async generateText(request: GenerationRequest): Promise<GenerationResult> {
    if (!this.currentModel || !this.currentModel.isReady) {
      return { success: false, error: "No model loaded" }
    }

    try {
      const response = await this.loader.generate(request)
      return { success: true, response }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Generation failed"
      return { success: false, error: errorMessage }
    }
  }

  async getModelStatus(): Promise<{ model: string | null; status: ModelStatus | null; ready: boolean }> {
    if (!this.currentModel) {
      return { model: null, status: null, ready: false }
    }

    return {
      model: this.currentModel.info.name,
      status: this.currentModel.status,
      ready: this.currentModel.isReady,
    }
  }

  async getAllModels(): Promise<Model[]> {
    return this.repository.getAllModels()
  }

  async unloadCurrentModel(): Promise<boolean> {
    if (!this.currentModel) return true

    const success = await this.loader.unloadModel(this.currentModel.info.name)
    if (success) {
      this.currentModel = null
    }
    return success
  }
}
