import { Command } from "commander"
import inquirer from "inquirer"
import chalk from "chalk"
import ora from "ora"
import type { ModelService } from "../../application/services/model-service.js"
import { ModelRegistry } from "../../infrastructure/registries/model-registry.js"
import { HealthMonitor } from "../../infrastructure/monitoring/health-monitor.js"

export class CLIInterface {
  private program: Command

  constructor(private modelService: ModelService) {
    this.program = new Command()
    this.setupCommands()
  }

  private setupCommands(): void {
    this.program.name("llama-service").description("Llama Model Service CLI").version("1.0.0")

    this.program
      .command("setup <model>")
      .description("Setup and load a model")
      .action(async (model: string) => {
        await this.setupModel(model)
      })

    this.program
      .command("generate")
      .description("Generate text interactively")
      .option("-p, --prompt <prompt>", "Text prompt")
      .option("-t, --tokens <number>", "Max tokens", "100")
      .option("--temperature <number>", "Temperature", "0.7")
      .action(async (options) => {
        await this.generateText(options)
      })

    this.program
      .command("status")
      .description("Show model status")
      .action(async () => {
        await this.showStatus()
      })

    this.program
      .command("list")
      .description("List all available models")
      .action(async () => {
        await this.listModels()
      })

    this.program
      .command("interactive")
      .description("Start interactive mode")
      .action(async () => {
        await this.runInteractive()
      })

    this.program
      .command("search <query>")
      .description("Search for models in the registry")
      .action(async (query: string) => {
        await this.searchModels(query)
      })

    this.program
      .command("health")
      .description("Show detailed health information")
      .action(async () => {
        await this.showHealth()
      })

    this.program
      .command("registry")
      .description("Show all models in the registry")
      .option("-t, --tag <tag>", "Filter by tag")
      .option("-v, --verified", "Show only verified models")
      .action(async (options) => {
        await this.showRegistry(options)
      })
  }

  async run(args: string[]): Promise<void> {
    await this.program.parseAsync(args)
  }

  private async setupModel(modelName: string): Promise<void> {
    console.log(chalk.blue(`🚀 Setting up model: ${modelName}`))

    const spinner = ora("Initializing...").start()

    const result = await this.modelService.setupModel(modelName, (progress, stage) => {
      spinner.text = `${stage} (${Math.round(progress)}%)`
    })

    spinner.stop()

    if (result.success) {
      console.log(chalk.green(`✅ Model ${modelName} is ready!`))
    } else {
      console.log(chalk.red(`❌ Setup failed: ${result.error}`))
    }
  }

  private async generateText(options: any): Promise<void> {
    let prompt = options.prompt

    if (!prompt) {
      const answer = await inquirer.prompt([
        {
          type: "input",
          name: "prompt",
          message: "Enter your prompt:",
          validate: (input) => input.trim().length > 0 || "Prompt cannot be empty",
        },
      ])
      prompt = answer.prompt
    }

    const spinner = ora("Generating text...").start()

    const result = await this.modelService.generateText({
      prompt,
      maxTokens: Number.parseInt(options.tokens),
      temperature: Number.parseFloat(options.temperature),
    })

    spinner.stop()

    if (result.success && result.response) {
      console.log(chalk.green("\n🤖 Generated text:"))
      console.log(chalk.white(result.response.text))
      console.log(chalk.gray(`\n📊 Tokens: ${result.response.tokensUsed}, Time: ${result.response.processingTimeMs}ms`))
    } else {
      console.log(chalk.red(`❌ Generation failed: ${result.error}`))
    }
  }

  private async showStatus(): Promise<void> {
    const status = await this.modelService.getModelStatus()

    console.log(chalk.blue("\n📋 Model Status:"))
    console.log(`Model: ${status.model || "None"}`)
    console.log(`Status: ${status.status || "No model"}`)
    console.log(`Ready: ${status.ready ? "✅" : "❌"}`)
  }

  private async listModels(): Promise<void> {
    const models = await this.modelService.getAllModels()

    console.log(chalk.blue("\n📚 Available Models:"))

    if (models.length === 0) {
      console.log(chalk.gray("No models found"))
      return
    }

    models.forEach((model) => {
      const statusIcon = model.isReady
        ? "✅"
        : model.status === "error"
          ? "❌"
          : model.status === "downloading"
            ? "⬇️"
            : "⏳"

      console.log(`${statusIcon} ${model.info.name} (${model.status})`)
      console.log(`   ${chalk.gray(model.info.description)}`)
    })
  }

  private async runInteractive(): Promise<void> {
    console.log(chalk.blue("🦙 Welcome to Llama Model Service Interactive Mode"))
    console.log(chalk.gray('Type "help" for available commands or "exit" to quit\n'))

    while (true) {
      try {
        const answer = await inquirer.prompt([
          {
            type: "input",
            name: "command",
            message: ">",
          },
        ])

        const command = answer.command.trim()

        if (command === "exit" || command === "quit") {
          console.log(chalk.blue("👋 Goodbye!"))
          break
        }

        if (command === "help") {
          this.showHelp()
          continue
        }

        if (command.startsWith("setup ")) {
          const modelName = command.substring(6).trim()
          await this.setupModel(modelName)
          continue
        }

        if (command.startsWith("generate ")) {
          const prompt = command.substring(9).trim()
          await this.generateText({ prompt, tokens: "100", temperature: "0.7" })
          continue
        }

        if (command === "status") {
          await this.showStatus()
          continue
        }

        if (command === "list") {
          await this.listModels()
          continue
        }

        console.log(chalk.red('❓ Unknown command. Type "help" for available commands.'))
      } catch (error) {
        if (error && typeof error === "object" && "isTTYError" in error) {
          console.log(chalk.blue("\n👋 Goodbye!"))
          break
        }
        console.log(chalk.red(`❌ Error: ${error}`))
      }
    }
  }

  private async searchModels(query: string): Promise<void> {
    const registry = ModelRegistry.getInstance()
    const results = registry.searchModels(query)

    console.log(chalk.blue(`\n🔍 Search results for "${query}":`))

    if (results.length === 0) {
      console.log(chalk.gray("No models found"))
      return
    }

    results.forEach((entry) => {
      const verifiedIcon = entry.verified ? "✅" : "⚠️"
      const sizeInfo = entry.info.sizeGB ? `(${entry.info.sizeGB}GB)` : ""

      console.log(`${verifiedIcon} ${chalk.bold(entry.info.name)} ${chalk.gray(sizeInfo)}`)
      console.log(`   ${chalk.gray(entry.info.description)}`)
      console.log(`   ${chalk.cyan(`Tags: ${entry.tags.join(", ")}`)}`)
      console.log(`   ${chalk.yellow(`Popularity: ${entry.popularity}/100`)}`)
      console.log()
    })
  }

  private async showHealth(): Promise<void> {
    const healthMonitor = HealthMonitor.getInstance(this.modelService)
    const health = await healthMonitor.getHealthStatus()

    console.log(chalk.blue("\n🏥 System Health:"))

    const statusColor = health.status === "healthy" ? "green" : health.status === "degraded" ? "yellow" : "red"

    console.log(`Status: ${chalk[statusColor](health.status.toUpperCase())}`)
    console.log(`Uptime: ${Math.round(health.uptime / 1000)}s`)
    console.log(
      `Memory: ${Math.round(health.memory.percentage)}% (${Math.round(health.memory.used / 1024 / 1024)}MB used)`,
    )
    console.log(`Models: ${health.models.loaded}/${health.models.total} loaded`)

    if (health.models.current) {
      console.log(`Current Model: ${chalk.green(health.models.current)}`)
    }

    if (health.lastError) {
      console.log(`Last Error: ${chalk.red(health.lastError)}`)
    }
  }

  private async showRegistry(options: any): Promise<void> {
    const registry = ModelRegistry.getInstance()

    let models
    if (options.tag) {
      models = registry.getModelsByTag(options.tag)
    } else if (options.verified) {
      models = registry.getVerifiedModels()
    } else {
      models = registry.getAllModels()
    }

    console.log(chalk.blue("\n📚 Model Registry:"))

    if (models.length === 0) {
      console.log(chalk.gray("No models found"))
      return
    }

    models.forEach((entry) => {
      const verifiedIcon = entry.verified ? "✅" : "⚠️"
      const sizeInfo = entry.info.sizeGB ? `(${entry.info.sizeGB}GB)` : ""

      console.log(`${verifiedIcon} ${chalk.bold(entry.info.name)} ${chalk.gray(sizeInfo)}`)
      console.log(`   ${chalk.gray(entry.info.description)}`)
      console.log(`   ${chalk.cyan(`HF: ${entry.info.huggingFaceId}`)}`)
      console.log(`   ${chalk.yellow(`Popularity: ${entry.popularity}/100`)}`)
      console.log()
    })
  }

  private showHelp(): void {
    console.log(chalk.blue("\n📖 Available Commands:"))
    console.log("  setup <model>     - Setup and load a model")
    console.log("  generate <prompt> - Generate text with prompt")
    console.log("  status           - Show current model status")
    console.log("  list             - List all available models")
    console.log("  search <query>   - Search for models in registry")
    console.log("  registry         - Show model registry")
    console.log("  health           - Show system health")
    console.log("  help             - Show this help message")
    console.log("  exit/quit        - Exit interactive mode\n")
  }
}
