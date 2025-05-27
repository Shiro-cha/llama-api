import type { Model } from "../entities/model.js"
import type { GenerationRequest, GenerationResponse } from "../value-objects/generation-request.js"

export interface ModelLoader {
  loadModel(model: Model): Promise<boolean>
  unloadModel(modelName: string): Promise<boolean>
  generate(request: GenerationRequest): Promise<GenerationResponse>
  isModelLoaded(modelName: string): boolean
  getLoadedModels(): string[]
}
