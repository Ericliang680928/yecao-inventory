export type Role = 'admin' | 'counter' | 'reviewer'
export type BatchStatus = '進行中' | '待覆核' | '已結案'

export interface User {
  username: string
  name: string
  role: Role
}

export interface Product {
  id: string
  name: string
  category: string
  active: boolean
  stock: number
  unit: string
  syncedAt: string
}

export interface Batch {
  id: string
  date: string
  createdBy: string
  startTime: string
  endTime: string
  status: BatchStatus
  notes: string
}

export interface BatchItem {
  batchId: string
  date: string
  productId: string
  productName: string
  category: string
  unit: string
  bookStock: number
  actualStock: number | null
  diff: number | null
  reason: string
  notes: string
  counter: string
  countedAt: string
  reviewer: string
  reviewedAt: string
  version: string
}

export interface DashboardStats {
  batch: Batch | null
  total: number
  counted: number
  withDiff: number
  pending: number
}

export interface SyncResult {
  added: number
  updated: number
  disabled: number
  errors: string
  syncId: string
}
