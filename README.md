# Llama Model Service

A clean architecture implementation for loading and serving Llama models with Bun, featuring DDD principles and multiple interfaces.

## Features

- 🏗️ **Clean Architecture** with proper separation of concerns
- 🎯 **Domain-Driven Design** principles
- 🤗 **Hugging Face Integration** for model downloading
- 🚀 **Multiple Interfaces**: CLI and REST API
- ⚡ **Bun Runtime** for fast execution
- 🔄 **Async/Await** throughout
- 📦 **TypeScript** for type safety

## Installation

\`\`\`bash
# Install dependencies
bun install

# Make scripts executable
chmod +x src/main.ts src/cli.ts src/api.ts
\`\`\`

## Usage

### Interactive CLI Mode
\`\`\`bash
bun run dev
# or
bun run src/main.ts
\`\`\`

### Direct CLI Commands
\`\`\`bash
# Setup a model
bun run cli setup gpt2-small

# Generate text
bun run cli generate --prompt "Hello, world!"

# Check status
bun run cli status

# List models
bun run cli list
\`\`\`

### API Server
\`\`\`bash
# Start API server
bun run api

# Test endpoints
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/v1/models/setup -H "Content-Type: application/json" -d '{"modelName":"gpt2-small"}'
curl -X POST http://localhost:3000/api/v1/generate -H "Content-Type: application/json" -d '{"prompt":"Hello, world!"}'
\`\`\`

## Architecture

\`\`\`
src/
├── domain/                 # Core business logic
│   ├── entities/          # Domain entities
│   ├── value-objects/     # Value objects
│   ├── repositories/      # Repository interfaces
│   └── services/          # Domain service interfaces
├── application/           # Use cases and application services
│   └── services/
├── infrastructure/        # External concerns
│   ├── repositories/     # Repository implementations
│   ├── services/         # Service implementations
│   └── container.ts      # Dependency injection
└── presentation/          # User interfaces
    ├── cli/              # Command line interface
    └── api/              # REST API interface
\`\`\`

## Available Models

- `gpt2-small`: GPT-2 Small (500MB)
- `llama-7b`: Llama 7B (mapped to DialoGPT for demo)

## Environment Variables

- `PORT`: API server port (default: 3000)
- `HOST`: API server host (default: 0.0.0.0)
- `MODELS_PATH`: Models storage path (default: ./models)
