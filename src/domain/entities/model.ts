import { ModelStatus } from "../value-objects/model-status.js"
import type { ModelInfo } from "../value-objects/model-info.js"

export class Model {
  private _info: ModelInfo
  private _status: ModelStatus
  private _errorMessage?: string
  private _loadedAt?: Date

  constructor(info: ModelInfo) {
    this._info = info
    this._status = ModelStatus.NOT_DOWNLOADED
  }

  get info(): ModelInfo {
    return this._info
  }

  get status(): ModelStatus {
    return this._status
  }

  get errorMessage(): string | undefined {
    return this._errorMessage
  }

  get isReady(): boolean {
    return this._status === ModelStatus.LOADED
  }

  get loadedAt(): Date | undefined {
    return this._loadedAt
  }

  markDownloading(): void {
    this._status = ModelStatus.DOWNLOADING
    this._errorMessage = undefined
  }

  markDownloaded(): void {
    this._status = ModelStatus.DOWNLOADED
    this._errorMessage = undefined
  }

  markLoading(): void {
    this._status = ModelStatus.LOADING
    this._errorMessage = undefined
  }

  markLoaded(): void {
    this._status = ModelStatus.LOADED
    this._loadedAt = new Date()
    this._errorMessage = undefined
  }

  markError(error: string): void {
    this._status = ModelStatus.ERROR
    this._errorMessage = error
  }

  toJSON() {
    return {
      info: this._info,
      status: this._status,
      errorMessage: this._errorMessage,
      loadedAt: this._loadedAt,
      isReady: this.isReady,
    }
  }
}
