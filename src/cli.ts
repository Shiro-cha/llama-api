#!/usr/bin/env bun
import { Container } from "./infrastructure/container.js"
import { CLIInterface } from "./presentation/cli/cli-interface.js"

async function main() {
  const container = Container.getInstance()
  const modelService = container.getModelService()
  const cli = new CLIInterface(modelService)

  await cli.run(process.argv)
}

main().catch(console.error)
