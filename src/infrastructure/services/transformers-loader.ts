import type { ModelLoader } from "../../domain/services/model-loader.js"
import type { Model } from "../../domain/entities/model.js"
import type { GenerationRequest, GenerationResponse } from "../../domain/value-objects/generation-request.js"
import { pipeline, type Pipeline } from "@xenova/transformers"

export class TransformersLoader implements ModelLoader {
  private loadedModels: Map<string, Pipeline> = new Map()

  async loadModel(model: Model): Promise<boolean> {
    try {
      console.log(`Loading model ${model.info.name} from ${model.info.huggingFaceId}...`)

      // Create pipeline for the model
      const pipe = await pipeline(model.info.modelType, model.info.huggingFaceId, {
        local_files_only: false, // Allow downloading if not cached
        cache_dir: model.info.localPath,
      })

      this.loadedModels.set(model.info.name, pipe)
      console.log(`✅ Model ${model.info.name} loaded successfully`)
      return true
    } catch (error) {
      console.error(`❌ Failed to load model ${model.info.name}:`, error)
      return false
    }
  }

  async unloadModel(modelName: string): Promise<boolean> {
    try {
      if (this.loadedModels.has(modelName)) {
        this.loadedModels.delete(modelName)
        console.log(`✅ Model ${modelName} unloaded`)
      }
      return true
    } catch (error) {
      console.error(`❌ Failed to unload model ${modelName}:`, error)
      return false
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now()

    // Find a loaded model (for simplicity, use the first one)
    const modelEntry = Array.from(this.loadedModels.entries())[0]
    if (!modelEntry) {
      throw new Error("No model loaded")
    }

    const [modelName, pipeline] = modelEntry

    try {
      const result = await pipeline(request.prompt, {
        max_new_tokens: request.maxTokens || 100,
        temperature: request.temperature || 0.7,
        top_p: request.topP || 0.9,
        do_sample: request.doSample !== false,
        repetition_penalty: request.repetitionPenalty || 1.1,
      })

      const processingTime = Date.now() - startTime

      // Handle different response formats
      let generatedText: string
      if (Array.isArray(result)) {
        generatedText = result[0]?.generated_text || result[0]?.text || String(result[0])
      } else if (typeof result === "object" && result !== null) {
        generatedText = (result as any).generated_text || (result as any).text || String(result)
      } else {
        generatedText = String(result)
      }

      return {
        text: generatedText,
        tokensUsed: generatedText.split(" ").length, // Rough estimate
        processingTimeMs: processingTime,
        model: modelName,
        timestamp: new Date(),
      }
    } catch (error) {
      console.error("Generation failed:", error)
      throw new Error(`Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  isModelLoaded(modelName: string): boolean {
    return this.loadedModels.has(modelName)
  }

  getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys())
  }
}
