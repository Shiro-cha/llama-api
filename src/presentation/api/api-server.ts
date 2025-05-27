import Fastify, { type FastifyInstance } from "fastify"
import type { ModelService } from "../../application/services/model-service.js"
import { ConfigManager } from "../../infrastructure/config/app-config.js"
import { Logger } from "../../infrastructure/logging/logger.js"
import { HealthMonitor } from "../../infrastructure/monitoring/health-monitor.js"
import { ModelRegistry } from "../../infrastructure/registries/model-registry.js"

export class APIServer {
  private server: FastifyInstance

  constructor(private modelService: ModelService) {
    this.server = Fastify({
      logger: false, // We'll use our custom logger
      trustProxy: true,
      bodyLimit: 1048576, // 1MB
    })
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    const config = ConfigManager.getInstance().getConfig()
    const logger = Logger.getInstance()

    // CORS
    this.server.register(require("@fastify/cors"), {
      origin: config.server.cors.origin,
      credentials: config.server.cors.credentials,
    })

    // Request logging
    this.server.addHook("onRequest", async (request, reply) => {
      logger.info("Incoming request", {
        method: request.method,
        url: request.url,
        ip: request.ip,
      })
    })

    // Error handling
    this.server.setErrorHandler(async (error, request, reply) => {
      logger.error(
        "Request error",
        {
          method: request.method,
          url: request.url,
          error: error.message,
        },
        error,
      )

      reply.code(500).send({
        error: "Internal Server Error",
        message: error.message,
      })
    })
  }

  private setupRoutes(): void {
    // Health check
    this.server.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() }
    })

    // Get model status
    this.server.get("/api/v1/models/status", async () => {
      const status = await this.modelService.getModelStatus()
      return { data: status }
    })

    // List all models
    this.server.get("/api/v1/models", async () => {
      const models = await this.modelService.getAllModels()
      return { data: models.map((m) => m.toJSON()) }
    })

    // Setup model
    this.server.post<{
      Body: { modelName: string }
    }>("/api/v1/models/setup", async (request, reply) => {
      const { modelName } = request.body

      if (!modelName) {
        reply.code(400)
        return { error: "modelName is required" }
      }

      const result = await this.modelService.setupModel(modelName)

      if (!result.success) {
        reply.code(500)
        return { error: result.error }
      }

      return { data: result }
    })

    // Generate text
    this.server.post<{
      Body: {
        prompt: string
        maxTokens?: number
        temperature?: number
        topP?: number
      }
    }>("/api/v1/generate", async (request, reply) => {
      const { prompt, maxTokens, temperature, topP } = request.body

      if (!prompt) {
        reply.code(400)
        return { error: "prompt is required" }
      }

      const result = await this.modelService.generateText({
        prompt,
        maxTokens,
        temperature,
        topP,
      })

      if (!result.success) {
        reply.code(500)
        return { error: result.error }
      }

      return { data: result.response }
    })

    // WebSocket for real-time generation (optional)
    this.server.register(
      async function (fastify) {
        await fastify.register(require("@fastify/websocket"))

        fastify.get("/ws/generate", { websocket: true }, (connection, req) => {
          connection.socket.on("message", async (message) => {
            try {
              const data = JSON.parse(message.toString())
              const result = await this.modelService.generateText(data)

              connection.socket.send(
                JSON.stringify({
                  type: "response",
                  data: result,
                }),
              )
            } catch (error) {
              connection.socket.send(
                JSON.stringify({
                  type: "error",
                  error: error instanceof Error ? error.message : "Unknown error",
                }),
              )
            }
          })
        })
      }.bind(this),
    )

    // Enhanced health check with detailed monitoring
    this.server.get("/health/detailed", async () => {
      const healthMonitor = HealthMonitor.getInstance(this.modelService)
      const status = await healthMonitor.getHealthStatus()
      return { data: status }
    })

    // Model registry endpoints
    this.server.get("/api/v1/registry/models", async () => {
      const registry = ModelRegistry.getInstance()
      const models = registry.getAllModels()
      return { data: models }
    })

    this.server.get<{
      Querystring: { q?: string; tag?: string }
    }>("/api/v1/registry/search", async (request) => {
      const registry = ModelRegistry.getInstance()
      const { q, tag } = request.query

      let results
      if (q) {
        results = registry.searchModels(q)
      } else if (tag) {
        results = registry.getModelsByTag(tag)
      } else {
        results = registry.getVerifiedModels()
      }

      return { data: results }
    })

    // Model management endpoints
    this.server.delete<{
      Params: { modelName: string }
    }>("/api/v1/models/:modelName", async (request, reply) => {
      const { modelName } = request.params

      // This would need to be implemented in the ModelService
      // For now, return not implemented
      reply.code(501)
      return { error: "Model deletion not implemented yet" }
    })
  }

  async start(port = 3000, host = "0.0.0.0"): Promise<void> {
    try {
      await this.server.listen({ port, host })
      console.log(`🚀 API Server running on http://${host}:${port}`)
    } catch (error) {
      this.server.log.error(error)
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    await this.server.close()
  }
}
