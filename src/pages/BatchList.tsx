import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Batch } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function BatchList() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/batches')
      .then(r => setBatches(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-800">盤點批次</h2>
        <Link to="/batches/new" className="btn-primary text-sm py-2 px-4">
          + 新建
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">載入中…</div>
      ) : batches.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">尚無盤點批次</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(b => (
            <Link
              key={b.id}
              to={b.status === '已結案' ? `/history?batch=${b.id}` : `/batches/${b.id}`}
              className="card block active:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-800">{b.date}</p>
                  <p className="text-sm text-gray-500 mt-0.5">建立人：{b.createdBy}</p>
                  {b.notes && <p className="text-sm text-gray-400 mt-0.5">{b.notes}</p>}
                </div>
                <div className="text-right">
                  <StatusBadge status={b.status} />
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(b.startTime).toLocaleString('zh-TW', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
