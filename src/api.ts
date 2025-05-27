#!/usr/bin/env bun
import { Container } from "./infrastructure/container.js"
import { APIServer } from "./presentation/api/api-server.js"

async function main() {
  const container = Container.getInstance()
  const modelService = container.getModelService()
  const apiServer = new APIServer(modelService)

  const port = Number.parseInt(process.env.PORT || "3000")
  const host = process.env.HOST || "0.0.0.0"

  await apiServer.start(port, host)
}

main().catch(console.error)
