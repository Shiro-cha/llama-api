export interface ModelInfo {
  readonly name: string
  readonly huggingFaceId: string
  readonly version: string
  readonly description: string
  readonly localPath: string
  readonly modelType: "text-generation" | "text2text-generation" | "feature-extraction"
  readonly sizeGB?: number
  readonly requiredFiles: string[]
}

export class ModelInfoBuilder {
  private info: Partial<ModelInfo> = {}

  setName(name: string): this {
    this.info.name = name
    return this
  }

  setHuggingFaceId(id: string): this {
    this.info.huggingFaceId = id
    return this
  }

  setVersion(version: string): this {
    this.info.version = version
    return this
  }

  setDescription(description: string): this {
    this.info.description = description
    return this
  }

  setLocalPath(path: string): this {
    this.info.localPath = path
    return this
  }

  setModelType(type: ModelInfo["modelType"]): this {
    this.info.modelType = type
    return this
  }

  setSizeGB(size: number): this {
    this.info.sizeGB = size
    return this
  }

  setRequiredFiles(files: string[]): this {
    this.info.requiredFiles = files
    return this
  }

  build(): ModelInfo {
    if (
      !this.info.name ||
      !this.info.huggingFaceId ||
      !this.info.version ||
      !this.info.localPath ||
      !this.info.modelType ||
      !this.info.requiredFiles
    ) {
      throw new Error("Missing required ModelInfo fields")
    }
    return this.info as ModelInfo
  }
}
