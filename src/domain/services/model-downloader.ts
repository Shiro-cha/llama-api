import type { ModelInfo } from "../value-objects/model-info.js"

export interface ModelDownloader {
  download(modelInfo: ModelInfo, onProgress?: (progress: number) => void): Promise<boolean>
  isModelDownloaded(modelInfo: ModelInfo): Promise<boolean>
  getDownloadProgress(modelInfo: ModelInfo): Promise<number>
}
