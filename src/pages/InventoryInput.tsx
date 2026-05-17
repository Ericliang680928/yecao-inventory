import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import type { Batch, BatchItem } from '../types'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'

type FilterTab = 'all' | 'uncounted' | 'diff' | 'mine'

interface LockInfo { lockedBy: string; lockedAt: string }
type LocksMap = Record<string, LockInfo>

function getItemStatus(item: BatchItem): string {
  if (item.actualStock === null) return 'uncounted'
  if (item.diff !== null && item.diff !== 0) return 'diff'
  return 'counted'
}

interface RowProps {
  item: BatchItem
  batchId: string
  onSave: (productId: string, actualStock: number, version: string) => Promise<void>
  isLast: boolean
  nextRef: React.RefObject<HTMLInputElement> | null
  isClosed: boolean
  lock: LockInfo | null
  myUsername: string
}

function ItemRow({ item, batchId, onSave, isLast, nextRef, isClosed, lock, myUsername }: RowProps) {
  const [val, setVal] = useState(item.actualStock !== null ? String(item.actualStock) : '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const status = getItemStatus(item)
  const lockedByOther = lock && lock.lockedBy !== myUsername

  const acquireLock = () => {
    api.post('/batches/' + batchId + '/items/' + item.productId + '/lock').catch(() => {})
  }
  const releaseLock = () => {
    api.delete('/batches/' + batchId + '/items/' + item.productId + '/lock').catch(() => {})
  }

  const save = async () => {
    if (val === '' || val === String(item.actualStock)) return
    const num = parseFloat(val)
    if (isNaN(num)) { toast.error('請輸入有效數字'); return }
    setSaving(true)
    try {
      await onSave(item.productId, num, item.version)
    } catch {
      // error already toasted
    } finally { setSaving(false) }
  }

  const handleFocus = () => { if (!isClosed) acquireLock() }
  const handleBlur = async () => { releaseLock(); await save() }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); nextRef?.current?.focus() }
  }

  const rowBg =
    status === 'diff'    ? 'bg-amber-50 border-l-4 border-amber-400' :
    status === 'counted' ? 'bg-green-50 border-l-4 border-green-400' :
    'bg-white border-l-4 border-gray-200'

  return (
    <div className={rowBg + ' px-4 py-3 flex items-center gap-3 relative'}>
      {lockedByOther && (
        <div className="absolute inset-0 bg-orange-50/70 flex items-center justify-end pr-4 z-10 pointer-events-none">
          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-300 rounded-full px-2 py-0.5 font-medium">
            {lock!.lockedBy} 正在編輯
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{item.productName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{item.productId}</span>
          {item.category && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{item.category}</span>}
          {item.unit && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{item.unit}</span>}
        </div>
      </div>
      <div className="text-center w-12">
        <p className="text-xs text-gray-500">帳面</p>
        <p className="font-semibold text-gray-700">{item.bookStock}</p>
      </div>
      <div className="text-center w-20">
        <p className="text-xs text-gray-500">實盤</p>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          step="any"
          disabled={isClosed || saving || !!lockedByOther}
          className={'w-full text-center text-lg font-bold border-b-2 bg-transparent py-0.5 ' +
            (status === 'diff'    ? 'border-amber-500 text-amber-700' :
             status === 'counted' ? 'border-green-500 text-green-700' :
             'border-gray-300 text-gray-800') +
            ' focus:border-primary-500 disabled:opacity-50'}
          value={val}
          onChange={e => setVal(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="—"
        />
      </div>
      <div className="text-center w-12">
        <p className="text-xs text-gray-500">差異</p>
        <p className={'font-semibold ' + (
          item.diff === null ? 'text-gray-300' :
          item.diff > 0  ? 'text-green-600' :
          item.diff < 0  ? 'text-red-600' : 'text-gray-600'
        )}>
          {item.diff === null ? '—' : item.diff > 0 ? '+' + item.diff : String(item.diff)}
        </p>
      </div>
      <div className="w-5">
        {saving && <span className="text-gray-400 text-xs animate-pulse">⟳</span>}
        {!saving && status === 'counted' && <span className="text-green-500">✓</span>}
        {!saving && status === 'diff'    && <span className="text-amber-500">!</span>}
      </div>
    </div>
  )
}

export default function InventoryInput() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [batch,   setBatch]   = useState<Batch | null>(null)
  const [items,   setItems]   = useState<BatchItem[]>([])
  const [locks,   setLocks]   = useState<LocksMap>({})
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<FilterTab>('all')
  const [search,  setSearch]  = useState('')
  const inputRefs = useRef<(React.RefObject<HTMLInputElement>)[]>([])

  const load = useCallback(async () => {
    if (!id) return
    const [bRes, iRes] = await Promise.all([
      api.get('/batches/' + id),
      api.get('/batches/' + id + '/items'),
    ])
    setBatch(bRes.data)
    setItems(iRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (!id) return
    const fetchLocks = () => {
      api.get('/batches/' + id + '/locks').then(r => setLocks(r.data)).catch(() => {})
    }
    fetchLocks()
    const timer = setInterval(fetchLocks, 5000)
    return () => clearInterval(timer)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSave = async (productId: string, actualStock: number, version: string) => {
    try {
      const res = await api.put('/batches/' + id + '/items/' + productId, { actualStock, version })
      setItems(prev => prev.map(i => i.productId === productId ? { ...i, ...res.data } : i))
      toast.success('已儲存', { duration: 1000 })
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('衝突：資料已被他人修改，正在重新載入…')
        load()
      }
      throw err
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!batch) return
    if (newStatus === '已結案' && !confirm('結案後無法再編輯，確定嗎？')) return
    await api.patch('/batches/' + id + '/status', { status: newStatus })
    setBatch(prev => prev ? { ...prev, status: newStatus as any } : null)
    toast.success('狀態已更新為：' + newStatus)
  }

  const visible = items.filter(item => {
    const matchSearch = !search || item.productName.includes(search) || item.productId.includes(search)
    if (!matchSearch) return false
    const s = getItemStatus(item)
    if (filter === 'uncounted') return s === 'uncounted'
    if (filter === 'diff')      return s === 'diff'
    if (filter === 'mine')      return item.counter === (user?.name || user?.username)
    return true
  })

  inputRefs.current = visible.map((_, i) =>
    inputRefs.current[i] || { current: null } as React.RefObject<HTMLInputElement>
  )

  const total    = items.length
  const counted  = items.filter(i => i.actualStock !== null).length
  const withDiff = items.filter(i => i.diff !== null && i.diff !== 0).length
  const pct      = total > 0 ? Math.round(counted / total * 100) : 0
  const isClosed = batch?.status === '已結案'
  const myUsername = user?.name || user?.username || ''
  const othersEditing = Object.values(locks).filter(info => info.lockedBy !== myUsername).length

  if (loading) return <div className="text-center py-20 text-gray-400">載入盤點清單中…</div>
  if (!batch)  return <div className="text-center py-20 text-gray-400">批次不存在</div>

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: '全部 ' + total },
    { key: 'uncounted', label: '未盤 ' + (total - counted) },
    { key: 'diff',      label: '差異 ' + withDiff },
    { key: 'mine',      label: '我負責' },
  ]

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-white shadow-sm sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <button onClick={() => navigate('/batches')} className="text-gray-500 text-sm">← 返回</button>
          <div className="text-center">
            <p className="font-bold text-gray-800">{batch.date} 盤點</p>
            <div className="flex items-center gap-2 justify-center mt-0.5">
              <StatusBadge status={batch.status} size="sm" />
              <span className="text-xs text-gray-500">{pct}% 完成</span>
              {othersEditing > 0 && (
                <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5">
                  {othersEditing} 人同時編輯中
                </span>
              )}
            </div>
          </div>
          {!isClosed ? (
            <select
              className="text-sm border border-gray-300 rounded-lg px-2 py-1"
              value={batch.status}
              onChange={e => handleStatusChange(e.target.value)}
            >
              <option value="進行中">進行中</option>
              <option value="待覆核">送覆核</option>
              <option value="已結案">結案</option>
            </select>
          ) : (
            <div className="w-16" />
          )}
        </div>

        <div className="px-4 py-2 flex gap-2 border-b bg-gray-50">
          <span className="text-xs text-gray-500 self-center mr-1">模式：</span>
          <button className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white shadow-sm">
            列表模式
          </button>
          <button
            onClick={() => navigate('/batches/' + id + '/category')}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-300 text-gray-600"
          >
            類別模式
          </button>
        </div>

        <div className="px-4 pt-2 pb-1">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: pct + '%' }} />
          </div>
        </div>

        <div className="px-4 py-2">
          <input
            type="search"
            className="input-field py-2"
            placeholder="搜尋商品名稱或編號"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex border-b">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={'flex-1 py-2 text-xs font-medium transition-colors touch-manipulation ' +
                (filter === tab.key ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500')}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-100 px-4 py-1.5 flex items-center gap-3 text-xs text-gray-500 font-medium border-b">
        <div className="flex-1">商品</div>
        <div className="w-12 text-center">帳面</div>
        <div className="w-20 text-center">實盤</div>
        <div className="w-12 text-center">差異</div>
        <div className="w-5" />
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {visible.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search ? '沒有符合的商品' : '此篩選條件下沒有項目'}
          </div>
        ) : (
          visible.map((item, idx) => (
            <ItemRow
              key={item.productId}
              item={item}
              batchId={id!}
              onSave={handleSave}
              isLast={idx === visible.length - 1}
              nextRef={visible[idx + 1] ? inputRefs.current[idx + 1] : null}
              isClosed={isClosed}
              lock={locks[item.productId] || null}
              myUsername={myUsername}
            />
          ))
        )}
      </div>

      {!isClosed && (
        <div className="bg-white border-t px-4 py-3 flex items-center justify-between">
          <div className="flex gap-4 text-sm text-gray-600">
            <span>已盤 <strong className="text-green-600">{counted}</strong></span>
            <span>差異 <strong className="text-amber-600">{withDiff}</strong></span>
            <span>待盤 <strong className="text-gray-700">{total - counted}</strong></span>
          </div>
          {counted === total && withDiff > 0 && (
            <button onClick={() => handleStatusChange('待覆核')} className="btn-primary text-sm py-2 px-4">
              送覆核
            </button>
          )}
        </div>
      )}
    </div>
  )
}
