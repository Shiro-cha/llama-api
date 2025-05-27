import type { Model } from "../entities/model.js"

export interface ModelRepository {
  getModel(name: string): Promise<Model | null>
  saveModel(model: Model): Promise<void>
  getAllModels(): Promise<Model[]>
  deleteModel(name: string): Promise<boolean>
}
