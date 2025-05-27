export interface GenerationRequest {
  readonly prompt: string
  readonly maxTokens?: number
  readonly temperature?: number
  readonly topP?: number
  readonly topK?: number
  readonly repetitionPenalty?: number
  readonly doSample?: boolean
}

export interface GenerationResponse {
  readonly text: string
  readonly tokensUsed: number
  readonly processingTimeMs: number
  readonly model: string
  readonly timestamp: Date
}
