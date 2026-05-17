import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import type { Batch, BatchItem } from '../types/index'
import StatusBadge from '../components/StatusBadge'

const CAT_COLORS = [
  { activeBg: 'bg-emerald-500', activeText: 'text-white', cardBorder: 'border-emerald-300', cardBg: 'bg-emerald-50' },
  { activeBg: 'bg-sky-500',     activeText: 'text-white', cardBorder: 'border-sky-300',     cardBg: 'bg-sky-50'     },
  { activeBg: 'bg-violet-500',  activeText: 'text-white', cardBorder: 'border-violet-300',  cardBg: 'bg-violet-50'  },
  { activeBg: 'bg-amber-500',   activeText: 'text-white', cardBorder: 'border-amber-300',   cardBg: 'bg-amber-50'   },
  { activeBg: 'bg-rose-500',    activeText: 'text-white', cardBorder: 'border-rose-300',    cardBg: 'bg-rose-50'    },
  { activeBg: 'bg-cyan-600',    activeText: 'text-white', cardBorder: 'border-cyan-300',    cardBg: 'bg-cyan-50'    },
  { activeBg: 'bg-orange-500',  activeText: 'text-white', cardBorder: 'border-orange-300',  cardBg: 'bg-orange-50'  },
  { activeBg: 'bg-teal-600',    activeText: 'text-white', cardBorder: 'border-teal-300',    cardBg: 'bg-teal-50'    },
]

function getCatColor(idx: number) {
  return CAT_COLORS[idx % CAT_COLORS.length]
}

function getItemStatus(item: BatchItem): 'pending' | 'ok' | 'diff' {
  if (item.actualStock === null) return 'pending'
  if (item.diff !== null && item.diff !== 0) return 'diff'
  return 'ok'
}

// ── 商品卡片 ──────────────────────────────────────────────────
interface CardProps {
  item: BatchItem
  isClosed: boolean
  onSave: (productId: string, actualStock: number, unit: string, version: string) => Promise<void>
  nextRef: React.RefObject<HTMLInputElement> | null
}

function ProductCard({ item, isClosed, onSave, nextRef }: CardProps) {
  const status = getItemStatus(item)

  // unit 存在 notes 前綴 "unit:xxx"
  const parseUnit = (notes: string) => {
    if (!notes) return ''
    if (notes.startsWith('unit:')) {
      const pipe = notes.indexOf('|')
      return pipe === -1 ? notes.slice(5) : notes.slice(5, pipe)
    }
    return ''
  }

  const [val,     setVal]   = useState(item.actualStock !== null ? String(item.actualStock) : '')
  const [unit,    setUnit]  = useState(() => parseUnit(item.notes || ''))
  const [saving,  setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSave = useCallback(async (qtyStr: string, u: string) => {
    if (qtyStr === '' || qtyStr === String(item.actualStock)) return
    const num = parseFloat(qtyStr)
    if (isNaN(num)) { toast.error('請輸入有效數字'); return }
    setSaving(true)
    try {
      await onSave(item.productId, num, u, item.version)
    } catch {
      // handled in parent
    } finally { setSaving(false) }
  }, [item.productId, item.actualStock, item.version, onSave])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      doSave(val, unit)
      nextRef?.current?.focus()
    }
  }

  const statusLabel =
    status === 'ok'   ? '已盤' :
    status === 'diff' ? '差異' : '未盤'

  const statusColor =
    status === 'ok'   ? 'text-green-600 bg-green-100' :
    status === 'diff' ? 'text-amber-700 bg-amber-100' :
    'text-gray-400 bg-gray-100'

  const borderColor =
    status === 'ok'   ? 'border-green-300 bg-green-50' :
    status === 'diff' ? 'border-amber-300 bg-amber-50' :
    'border-gray-200 bg-white'

  const inputColor =
    status === 'ok'   ? 'border-green-400 text-green-800' :
    status === 'diff' ? 'border-amber-500 text-amber-800' :
    'border-gray-300 text-gray-800'

  return (
    <div className={`rounded-xl border-2 ${borderColor} p-4 shadow-sm`}>
      {/* 名稱列 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 leading-snug">{item.productName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{item.productId}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${statusColor}`}>
          {saving ? '儲存中' : statusLabel}
        </span>
      </div>

      {/* 帳面 */}
      <p className="text-sm text-gray-500 mb-3">
        帳面庫存：<span className="font-semibold text-gray-700">{item.bookStock}</span>
      </p>

      {/* 輸入列 */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-1">實盤數量</p>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="any"
            disabled={isClosed || saving}
            className={`w-full text-center text-2xl font-bold border-b-2 ${inputColor}
              bg-transparent py-1 focus:outline-none disabled:opacity-40`}
            value={val}
            placeholder="—"
            onChange={e => setVal(e.target.value)}
            onBlur={() => doSave(val, unit)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="w-24 flex-shrink-0">
          <p className="text-xs text-gray-500 mb-1">單位</p>
          <input
            type="text"
            disabled={isClosed}
            className="w-full text-center text-base border-b-2 border-gray-300
              bg-transparent py-1 focus:outline-none text-gray-700 disabled:opacity-40"
            value={unit}
            placeholder="斤/包/條"
            onChange={e => setUnit(e.target.value)}
            onBlur={() => {
              if (val !== '' && val !== String(item.actualStock)) doSave(val, unit)
            }}
          />
        </div>
      </div>

      {/* 差異 */}
      {item.diff !== null && item.diff !== 0 && (
        <p className={`text-xs mt-2 font-semibold ${item.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
          差異：{item.diff > 0 ? '+' : ''}{item.diff}
        </p>
      )}
    </div>
  )
}

// ── 主頁面 ────────────────────────────────────────────────────
export default function CategoryCount() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [batch,   setBatch]   = useState<Batch | null>(null)
  const [items,   setItems]   = useState<BatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selCat,  setSelCat]  = useState('')

  const listRef  = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<React.RefObject<HTMLInputElement>[]>([])

  const load = useCallback(async () => {
    if (!id) return
    const [bRes, iRes] = await Promise.all([
      api.get(`/batches/${id}`),
      api.get(`/batches/${id}/items`),
    ])
    setBatch(bRes.data)
    const fetched: BatchItem[] = iRes.data
    setItems(fetched)
    const cats = Array.from(new Set(fetched.map(i => i.category || '其他'))).sort()
    setSelCat(prev => prev || cats[0] || '')
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const categories = Array.from(new Set(items.map(i => i.category || '其他'))).sort()
  const catItems   = items.filter(i => (i.category || '其他') === selCat)

  cardRefs.current = catItems.map((_, i) =>
    cardRefs.current[i] || { current: null } as React.RefObject<HTMLInputElement>
  )

  const handleSave = async (productId: string, actualStock: number, unit: string, version: string) => {
    const notes = unit ? `unit:${unit}` : ''
    try {
      const res = await api.put(`/batches/${id}/items/${productId}`, { actualStock, notes, version })
      setItems(prev => prev.map(i => i.productId === productId ? { ...i, ...res.data } : i))
      toast.success('已儲存', { duration: 800 })
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('資料衝突，正在重新載入…')
        load()
      }
      throw err
    }
  }

  const handleCatSelect = (cat: string) => {
    setSelCat(cat)
    setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  const total      = items.length
  const counted    = items.filter(i => i.actualStock !== null).length
  const pct        = total > 0 ? Math.round(counted / total * 100) : 0
  const isClosed   = batch?.status === '已結案'
  const catTotal   = catItems.length
  const catCounted = catItems.filter(i => i.actualStock !== null).length

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-400">載入中...</div>
  }
  if (!batch) {
    return <div className="flex items-center justify-center h-screen text-gray-400">批次不存在</div>
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* 頂部固定區 */}
      <div className="bg-white shadow-sm sticky top-0 z-30 flex-shrink-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button
            onClick={() => navigate(`/batches/${id}`)}
            className="text-gray-500 text-sm"
          >
            &larr; 列表
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-800">{batch.date} 盤點</p>
            <div className="flex items-center gap-2 justify-center mt-0.5">
              <StatusBadge status={batch.status} size="sm" />
              <span className="text-xs text-gray-500">{pct}% 完成</span>
            </div>
          </div>
          <div className="w-14" />
        </div>

        {/* 進度條 */}
        <div className="px-4 py-2">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* 類別按鈕列 */}
        <div className="px-3 pb-3">
          <p className="text-xs text-gray-400 mb-2 px-1">選擇類別</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, idx) => {
              const color    = getCatColor(idx)
              const total    = items.filter(i => (i.category || '其他') === cat).length
              const done     = items.filter(i => (i.category || '其他') === cat && i.actualStock !== null).length
              const isActive = selCat === cat

              return (
                <button
                  key={cat}
                  onClick={() => handleCatSelect(cat)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium',
                    'transition-all duration-150 touch-manipulation shadow-sm',
                    isActive
                      ? `${color.activeBg} ${color.activeText} scale-105 ring-2 ring-offset-1 ring-gray-400`
                      : 'bg-gray-100 text-gray-600',
                  ].join(' ')}
                >
                  <span>{cat}</span>
                  <span className={[
                    'text-xs px-1.5 py-0.5 rounded-full font-bold',
                    isActive
                      ? 'bg-white bg-opacity-25 text-white'
                      : done === total
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-500',
                  ].join(' ')}>
                    {done}/{total}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 商品卡片區 */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 pb-24">

        {/* 類別小標 */}
        {selCat && (
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{selCat}</h2>
              <p className="text-xs text-gray-500">
                已盤 {catCounted} / {catTotal} 件
                {catCounted === catTotal && catTotal > 0 && (
                  <span className="text-green-600 font-semibold ml-1">全部完成!</span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {catItems.length === 0 ? (
            <div className="text-center py-16 text-gray-400">此類別沒有商品</div>
          ) : (
            catItems.map((item, idx) => (
              <ProductCard
                key={item.productId}
                item={item}
                isClosed={isClosed}
                onSave={handleSave}
                nextRef={catItems[idx + 1] ? cardRefs.current[idx + 1] : null}
              />
            ))
          )}
        </div>
      </div>

      {/* 底部固定列 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex gap-4 text-sm text-gray-600">
          <span>已盤 <strong className="text-green-600">{counted}</strong></span>
          <span>待盤 <strong className="text-gray-700">{total - counted}</strong></span>
        </div>
        <button
          onClick={() => navigate(`/batches/${id}`)}
          className="text-sm text-primary-600 font-medium"
        >
          切換列表模式 &rarr;
        </button>
      </div>
    </div>
  )
}
