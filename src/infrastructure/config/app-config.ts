export interface AppConfig {
  server: {
    port: number
    host: string
    cors: {
      origin: string[]
      credentials: boolean
    }
  }
  models: {
    basePath: string
    maxConcurrentDownloads: number
    downloadTimeout: number
    cacheSize: number
  }
  generation: {
    defaultMaxTokens: number
    defaultTemperature: number
    maxPromptLength: number
    timeoutMs: number
  }
  logging: {
    level: string
    format: string
  }
}

export class ConfigManager {
  private static instance: ConfigManager
  private config: AppConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  getConfig(): AppConfig {
    return this.config
  }

  private loadConfig(): AppConfig {
    return {
      server: {
        port: Number.parseInt(process.env.PORT || "3000"),
        host: process.env.HOST || "0.0.0.0",
        cors: {
          origin: process.env.CORS_ORIGINS?.split(",") || ["*"],
          credentials: process.env.CORS_CREDENTIALS === "true",
        },
      },
      models: {
        basePath: process.env.MODELS_PATH || "./models",
        maxConcurrentDownloads: Number.parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || "2"),
        downloadTimeout: Number.parseInt(process.env.DOWNLOAD_TIMEOUT || "300000"), // 5 minutes
        cacheSize: Number.parseInt(process.env.MODEL_CACHE_SIZE || "2"), // Max 2 models in memory
      },
      generation: {
        defaultMaxTokens: Number.parseInt(process.env.DEFAULT_MAX_TOKENS || "100"),
        defaultTemperature: Number.parseFloat(process.env.DEFAULT_TEMPERATURE || "0.7"),
        maxPromptLength: Number.parseInt(process.env.MAX_PROMPT_LENGTH || "2048"),
        timeoutMs: Number.parseInt(process.env.GENERATION_TIMEOUT || "30000"), // 30 seconds
      },
      logging: {
        level: process.env.LOG_LEVEL || "info",
        format: process.env.LOG_FORMAT || "json",
      },
    }
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}
