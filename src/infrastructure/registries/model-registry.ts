import type { ModelInfo } from "../../domain/value-objects/model-info.js"
import { ModelInfoBuilder } from "../../domain/value-objects/model-info.js"
import { join } from "path"

export interface ModelRegistryEntry {
  info: ModelInfo
  tags: string[]
  popularity: number
  verified: boolean
}

export class ModelRegistry {
  private static instance: ModelRegistry
  private models: Map<string, ModelRegistryEntry> = new Map()

  private constructor() {
    this.initializeModels()
  }

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry()
    }
    return ModelRegistry.instance
  }

  private initializeModels(): void {
    const modelsBasePath = process.env.MODELS_PATH || "./models"

    const modelConfigs = [
      {
        name: "gpt2-small",
        huggingFaceId: "gpt2",
        description: "GPT-2 Small - Fast and lightweight text generation model",
        sizeGB: 0.5,
        tags: ["text-generation", "fast", "lightweight"],
        popularity: 95,
        verified: true,
      },
      {
        name: "gpt2-medium",
        huggingFaceId: "gpt2-medium",
        description: "GPT-2 Medium - Balanced performance and quality",
        sizeGB: 1.5,
        tags: ["text-generation", "balanced"],
        popularity: 85,
        verified: true,
      },
      {
        name: "distilgpt2",
        huggingFaceId: "distilgpt2",
        description: "DistilGPT-2 - Distilled version of GPT-2, faster inference",
        sizeGB: 0.3,
        tags: ["text-generation", "distilled", "fast"],
        popularity: 75,
        verified: true,
      },
      {
        name: "dialogpt-medium",
        huggingFaceId: "microsoft/DialoGPT-medium",
        description: "DialoGPT Medium - Conversational AI model",
        sizeGB: 1.2,
        tags: ["conversation", "dialog", "chat"],
        popularity: 70,
        verified: true,
      },
      {
        name: "t5-small",
        huggingFaceId: "t5-small",
        description: "T5 Small - Text-to-text transfer transformer",
        sizeGB: 0.2,
        tags: ["text2text-generation", "summarization", "translation"],
        popularity: 80,
        verified: true,
      },
      {
        name: "flan-t5-small",
        huggingFaceId: "google/flan-t5-small",
        description: "FLAN-T5 Small - Instruction-tuned T5 model",
        sizeGB: 0.3,
        tags: ["text2text-generation", "instruction-following", "flan"],
        popularity: 85,
        verified: true,
      },
      {
        name: "llama-7b-chat",
        huggingFaceId: "microsoft/DialoGPT-large", // Placeholder for demo
        description: "Llama 7B Chat - Large language model optimized for conversation",
        sizeGB: 7.0,
        tags: ["text-generation", "large", "chat", "llama"],
        popularity: 90,
        verified: true,
      },
    ]

    for (const config of modelConfigs) {
      const modelInfo = new ModelInfoBuilder()
        .setName(config.name)
        .setHuggingFaceId(config.huggingFaceId)
        .setVersion("1.0.0")
        .setDescription(config.description)
        .setLocalPath(join(modelsBasePath, config.name))
        .setModelType(config.tags.includes("text2text-generation") ? "text2text-generation" : "text-generation")
        .setSizeGB(config.sizeGB)
        .setRequiredFiles(["config.json", "pytorch_model.bin", "tokenizer.json", "tokenizer_config.json"])
        .build()

      this.models.set(config.name, {
        info: modelInfo,
        tags: config.tags,
        popularity: config.popularity,
        verified: config.verified,
      })
    }
  }

  getModel(name: string): ModelRegistryEntry | null {
    return this.models.get(name) || null
  }

  getAllModels(): ModelRegistryEntry[] {
    return Array.from(this.models.values()).sort((a, b) => b.popularity - a.popularity)
  }

  searchModels(query: string): ModelRegistryEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllModels().filter(
      (entry) =>
        entry.info.name.toLowerCase().includes(lowerQuery) ||
        entry.info.description.toLowerCase().includes(lowerQuery) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    )
  }

  getModelsByTag(tag: string): ModelRegistryEntry[] {
    return this.getAllModels().filter((entry) => entry.tags.includes(tag))
  }

  getVerifiedModels(): ModelRegistryEntry[] {
    return this.getAllModels().filter((entry) => entry.verified)
  }

  addCustomModel(entry: ModelRegistryEntry): void {
    this.models.set(entry.info.name, entry)
  }
}
