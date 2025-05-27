import type { ModelDownloader } from "../../domain/services/model-downloader.js"
import type { ModelInfo } from "../../domain/value-objects/model-info.js"
import { downloadFile } from "@huggingface/hub"
import { promises as fs } from "fs"
import { join } from "path"

export class HuggingFaceDownloader implements ModelDownloader {
  async download(modelInfo: ModelInfo, onProgress?: (progress: number) => void): Promise<boolean> {
    try {
      // Ensure local directory exists
      await fs.mkdir(modelInfo.localPath, { recursive: true })

      let completedFiles = 0
      const totalFiles = modelInfo.requiredFiles.length

      for (const fileName of modelInfo.requiredFiles) {
        const localFilePath = join(modelInfo.localPath, fileName)

        try {
          console.log(`Downloading ${fileName} from ${modelInfo.huggingFaceId}...`)

          // Download file from Hugging Face
          await downloadFile({
            repo: modelInfo.huggingFaceId,
            path: fileName,
            localPath: localFilePath,
          })

          completedFiles++
          const progress = (completedFiles / totalFiles) * 100
          onProgress?.(progress)

          console.log(`✅ Downloaded ${fileName}`)
        } catch (error) {
          console.error(`❌ Failed to download ${fileName}:`, error)
          // Continue with other files, but log the error
        }
      }

      // Check if at least some essential files were downloaded
      const essentialFiles = ["config.json"]
      const hasEssentialFiles = await Promise.all(
        essentialFiles.map(async (file) => {
          try {
            await fs.access(join(modelInfo.localPath, file))
            return true
          } catch {
            return false
          }
        }),
      )

      return hasEssentialFiles.some((exists) => exists)
    } catch (error) {
      console.error("Download failed:", error)
      return false
    }
  }

  async isModelDownloaded(modelInfo: ModelInfo): Promise<boolean> {
    try {
      // Check if all required files exist
      const fileChecks = await Promise.all(
        modelInfo.requiredFiles.map(async (fileName) => {
          try {
            await fs.access(join(modelInfo.localPath, fileName))
            return true
          } catch {
            return false
          }
        }),
      )

      return fileChecks.every((exists) => exists)
    } catch {
      return false
    }
  }

  async getDownloadProgress(modelInfo: ModelInfo): Promise<number> {
    try {
      const fileChecks = await Promise.all(
        modelInfo.requiredFiles.map(async (fileName) => {
          try {
            await fs.access(join(modelInfo.localPath, fileName))
            return true
          } catch {
            return false
          }
        }),
      )

      const downloadedCount = fileChecks.filter((exists) => exists).length
      return (downloadedCount / modelInfo.requiredFiles.length) * 100
    } catch {
      return 0
    }
  }
}
