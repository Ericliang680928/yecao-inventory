import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import type { Batch, BatchItem } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function History() {
  const [batches,  setBatches]  = useState<Batch[]>([])
  const [selected, setSelected] = useState<string>('')
  const [items,    setItems]    = useState<BatchItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    api.get('/batches')
      .then(r => {
        const all = (r.data as Batch[]).filter(b => b.status === '已結案')
        setBatches(all)
        const fromQuery = searchParams.get('batch')
        const target = fromQuery || all[0]?.id || ''
        setSelected(target)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoadingItems(true)
    api.get(`/batches/${selected}/items`)
      .then(r => setItems(r.data))
      .finally(() => setLoadingItems(false))
  }, [selected])

  const diffItems = items.filter(i => i.diff !== null && i.diff !== 0)
  const allItems  = items

  if (loading) return <div className="text-center py-20 text-gray-400">載入中…</div>

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-800 pt-2">歷史盤點記錄</h2>

      {batches.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">尚無已結案的盤點記錄</p>
        </div>
      ) : (
        <>
          {/* Batch selector */}
          <select
            className="input-field"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.date} — 結案於 {b.endTime ? new Date(b.endTime).toLocaleDateString('zh-TW') : '—'}
              </option>
            ))}
          </select>

          {loadingItems ? (
            <div className="text-center py-8 text-gray-400">載入明細…</div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center">
                  <p className="text-2xl font-bold text-gray-800">{allItems.length}</p>
                  <p className="text-xs text-gray-500 mt-1">盤點品項</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-amber-600">{diffItems.length}</p>
                  <p className="text-xs text-gray-500 mt-1">有差異</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-blue-600">{diffItems.filter(i => i.reviewer).length}</p>
                  <p className="text-xs text-gray-500 mt-1">已覆核</p>
                </div>
              </div>

              {/* Diff items */}
              {diffItems.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">差異明細</h3>
                  <div className="space-y-2">
                    {diffItems.map(item => (
                      <div key={item.productId} className="card">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{item.productName}</p>
                            <p className="text-xs text-gray-500">{item.productId}</p>
                            {item.reason && <p className="text-xs text-amber-600 mt-1">原因：{item.reason}</p>}
                            {item.notes  && <p className="text-xs text-gray-500">{item.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${item.diff! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.diff! > 0 ? `+${item.diff}` : item.diff}
                            </p>
                            <p className="text-xs text-gray-400">{item.bookStock} → {item.actualStock}</p>
                            {item.reviewer && <p className="text-xs text-blue-500 mt-1">覆核：{item.reviewer}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
