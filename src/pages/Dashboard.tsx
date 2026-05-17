import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { DashboardStats } from '../types'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../hooks/useAuth'

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`card text-center ${color}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/batches/dashboard')
      setStats(res.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const pct = stats && stats.total > 0
    ? Math.round(stats.counted / stats.total * 100) : 0

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Greeting */}
      <div className="pt-2">
        <h2 className="text-xl font-bold text-gray-800">
          早安，{user?.name} 👋
        </h2>
        <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('zh-TW', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">載入中…</div>
      ) : !stats?.batch ? (
        <div className="card text-center py-8">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-600 mb-4">今日尚無進行中的盤點批次</p>
          <Link to="/batches/new" className="btn-primary inline-block">
            + 建立今日盤點
          </Link>
        </div>
      ) : (
        <>
          {/* Batch Info */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-500">當前批次</p>
                <p className="font-bold text-gray-800">{stats.batch.date} 盤點</p>
              </div>
              <StatusBadge status={stats.batch.status} />
            </div>

            {/* Progress bar */}
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>盤點進度</span>
              <span>{stats.counted} / {stats.total}（{pct}%）</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="待盤點" value={stats.pending}  color="" />
            <Stat label="已盤點" value={stats.counted}  color="" />
            <Stat label="有差異" value={stats.withDiff} color="" />
          </div>

          {/* Action */}
          <Link
            to={`/batches/${stats.batch.id}`}
            className="btn-primary w-full block text-center text-lg py-4"
          >
            📦 繼續盤點
          </Link>
        </>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link to="/batches" className="card flex items-center gap-3 active:bg-gray-50">
          <span className="text-2xl">📋</span>
          <span className="font-medium text-gray-700">所有批次</span>
        </Link>
        <Link to="/history" className="card flex items-center gap-3 active:bg-gray-50">
          <span className="text-2xl">📜</span>
          <span className="font-medium text-gray-700">歷史記錄</span>
        </Link>
      </div>
    </div>
  )
}
