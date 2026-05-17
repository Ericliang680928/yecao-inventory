import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import type { Batch, BatchItem } from '../types'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'

export default function ReviewPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const { user, isReviewer } = useAuth()

  const [batch,   setBatch]   = useState<Batch | null>(null)
  const [items,   setItems]   = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([api.get(`/batches/${id}`), api.get(`/batches/${id}/items`)])
      .then(([b, i]) => { setBatch(b.data); setItems(i.data) })
      .finally(() => setLoading(false))
  }, [id])

  const diffItems = items.filter(i => i.diff !== null && i.diff !== 0)
  const isClosed  = batch?.status === '已結案'

  const handleReasonSave = async (productId: string, reason: string, notes: string, version: string) => {
    const res = await api.put(`/batches/${id}/items/${productId}`, { reason, notes, version })
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, ...res.data } : i))
    toast.success('已儲存', { duration: 1000 })
  }

  const handleReview = async (productId: string, version: string) => {
    const reviewerName = user?.name || user?.username || ''
    const res = await api.put(`/batches/${id}/items/${productId}`, { reviewer: reviewerName, version })
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, ...res.data } : i))
    toast.success('覆核完成')
  }

  const handleClose = async () => {
    if (!confirm('結案後無法再編輯盤點資料，確定結案？')) return
    await api.patch(`/batches/${id}/status`, { status: '已結案' })
    setBatch(prev => prev ? { ...prev, status: '已結案' } : null)
    toast.success('批次已結案')
  }

  const allReviewed = diffItems.length > 0 && diffItems.every(i => i.reviewer)

  if (loading) return <div className="text-center py-20 text-gray-400">載入中…</div>
  if (!batch)  return <div className="text-center py-20 text-gray-400">批次不存在</div>

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="pt-2">
        <button onClick={() => navigate(`/batches/${id}`)} className="text-gray-500 text-sm mb-2">← 返回盤點</button>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">差異覆核</h2>
          <StatusBadge status={batch.status} />
        </div>
        <p className="text-sm text-gray-500">{batch.date} · 共 {diffItems.length} 項差異</p>
      </div>

      {diffItems.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-600">所有商品盤點數量吻合，無差異</p>
        </div>
      ) : (
        <>
          {diffItems.map(item => (
            <DiffCard
              key={item.productId}
              item={item}
              isClosed={isClosed}
              canReview={isReviewer}
              onSaveReason={handleReasonSave}
              onReview={handleReview}
            />
          ))}

          {isReviewer && !isClosed && (
            <button
              onClick={handleClose}
              disabled={!allReviewed}
              className={`btn-primary w-full text-lg py-4 ${!allReviewed ? 'opacity-40' : ''}`}
            >
              {allReviewed ? '✅ 確認結案' : `尚有 ${diffItems.filter(i => !i.reviewer).length} 項未覆核`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function DiffCard({
  item, isClosed, canReview, onSaveReason, onReview,
}: {
  item: BatchItem
  isClosed: boolean
  canReview: boolean
  onSaveReason: (id: string, reason: string, notes: string, ver: string) => Promise<void>
  onReview: (id: string, ver: string) => Promise<void>
}) {
  const [reason, setReason] = useState(item.reason || '')
  const [notes,  setNotes]  = useState(item.notes  || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try { await onSaveReason(item.productId, reason, notes, item.version) }
    finally { setSaving(false) }
  }

  const isReviewed = !!item.reviewer

  return (
    <div className={`card border-l-4 ${isReviewed ? 'border-blue-400' : 'border-amber-400'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-800">{item.productName}</p>
          <p className="text-xs text-gray-500">{item.productId} · {item.category}</p>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${item.diff! > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {item.diff! > 0 ? `+${item.diff}` : item.diff}
          </span>
          <p className="text-xs text-gray-400">帳{item.bookStock} → 實{item.actualStock}</p>
        </div>
      </div>

      {/* 原因 */}
      <div className="space-y-2">
        <select
          className="input-field py-2 text-sm"
          value={reason}
          disabled={isClosed}
          onChange={e => setReason(e.target.value)}
        >
          <option value="">— 選擇差異原因 —</option>
          <option value="盤點錯誤">盤點錯誤</option>
          <option value="進貨未入帳">進貨未入帳</option>
          <option value="出貨未扣帳">出貨未扣帳</option>
          <option value="損耗報廢">損耗報廢</option>
          <option value="竊盜遺失">竊盜遺失</option>
          <option value="其他">其他</option>
        </select>
        <textarea
          className="input-field text-sm resize-none"
          rows={2}
          placeholder="備註說明"
          disabled={isClosed}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        {!isClosed && (
          <button onClick={save} disabled={saving} className="btn-secondary text-sm py-2 w-full">
            {saving ? '儲存中…' : '💾 儲存說明'}
          </button>
        )}
      </div>

      {/* 覆核 */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        {isReviewed ? (
          <p className="text-sm text-blue-600">✓ 已覆核：{item.reviewer}</p>
        ) : (
          canReview && !isClosed ? (
            <button
              onClick={() => onReview(item.productId, item.version)}
              className="btn-primary text-sm py-2 px-4"
            >
              標記覆核
            </button>
          ) : (
            <p className="text-sm text-gray-400">待覆核員確認</p>
          )
        )}
        {item.countedAt && (
          <p className="text-xs text-gray-400">
            盤點：{item.counter} · {new Date(item.countedAt).toLocaleTimeString('zh-TW', { hour:'2-digit', minute:'2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
