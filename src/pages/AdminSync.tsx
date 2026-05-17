import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import type { SyncResult } from '../types'

export default function AdminSync() {
  const [syncing, setSyncing] = useState(false)
  const [result,  setResult]  = useState<SyncResult | null>(null)
  const navigate = useNavigate()

  const handleSync = async () => {
    if (!confirm('確定從來源產品清單同步到盤點系統嗎？\n（新商品將加入，已移除的商品將標記停用）')) return
    setSyncing(true)
    setResult(null)
    try {
      const res = await api.post('/sync')
      setResult(res.data)
      toast.success(`同步完成：新增 ${res.data.added}、更新 ${res.data.updated}、停用 ${res.data.disabled}`)
    } catch {
      // error already toasted
    } finally { setSyncing(false) }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="pt-2">
        <button onClick={() => navigate(-1)} className="text-gray-500 text-sm mb-2">← 返回</button>
        <h2 className="text-xl font-bold text-gray-800">產品資料同步</h2>
        <p className="text-sm text-gray-500 mt-1">從來源 Google 試算表同步最新產品清單</p>
      </div>

      <div className="card space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">來源試算表</p>
          <p className="text-xs break-all text-blue-600">產品名單（唯讀）</p>
          <ul className="mt-2 space-y-0.5 text-xs">
            <li>• 新商品 → 自動加入盤點系統</li>
            <li>• 已更名商品 → 更新名稱</li>
            <li>• 來源已移除商品 → 標記「停用」</li>
          </ul>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary w-full text-lg py-4"
        >
          {syncing ? '同步中，請稍候…' : '🔄 立即同步產品清單'}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">同步結果</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-green-600">{result.added}</p>
              <p className="text-xs text-gray-500 mt-1">新增</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
              <p className="text-xs text-gray-500 mt-1">更新</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-gray-500">{result.disabled}</p>
              <p className="text-xs text-gray-500 mt-1">停用</p>
            </div>
          </div>
          {result.errors && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              ⚠️ {result.errors}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
