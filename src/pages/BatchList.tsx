import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Batch } from '../types'
import StatusBadge from '../components/StatusBadge'

export default function BatchList() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ msg: string; url?: string } | null>(null)

  useEffect(() => {
    api.get('/batches')
      .then(r => setBatches(r.data))
      .finally(() => setLoading(false))
  }, [])

  function showNotice(msg: string, url?: string) {
    setNotice({ msg, url })
    setTimeout(() => setNotice(null), 4000)
  }

  async function exportExcel(e: React.MouseEvent, batch: Batch) {
    e.preventDefault()
    e.stopPropagation()
    setExporting('excel-' + batch.id)
    try {
      const resp = await api.get('/export/' + batch.id + '/excel', { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(resp.data)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = '野草盤點_' + batch.date + '_' + batch.status + '.xlsx'
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      showNotice('Excel 匯出失敗')
    } finally {
      setExporting(null)
    }
  }

  async function exportGSheet(e: React.MouseEvent, batch: Batch) {
    e.preventDefault()
    e.stopPropagation()
    setExporting('gsheet-' + batch.id)
    try {
      const resp = await api.post('/export/' + batch.id + '/gsheet')
      const { tabTitle, spreadsheetUrl } = resp.data
      showNotice('已寫入分頁「' + tabTitle + '」', spreadsheetUrl)
    } catch {
      showNotice('Google Sheets 匯出失敗')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {notice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 max-w-xs">
          <span>{notice.msg}</span>
          {notice.url && (
            <a href={notice.url} target="_blank" rel="noreferrer" className="text-emerald-400 underline whitespace-nowrap">
              開啟
            </a>
          )}
        </div>
      )}

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
            <div key={b.id} className="card">
              <Link
                to={b.status === '已結案' ? '/history?batch=' + b.id : '/batches/' + b.id}
                className="block active:bg-gray-50 transition-colors"
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
                      {new Date(b.startTime).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={e => exportExcel(e, b)}
                  disabled={exporting === ('excel-' + b.id)}
                  className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors font-medium"
                >
                  {exporting === ('excel-' + b.id) ? '匯出中…' : 'Excel 下載'}
                </button>
                <button
                  onClick={e => exportGSheet(e, b)}
                  disabled={exporting === ('gsheet-' + b.id)}
                  className="flex-1 text-xs py-1.5 px-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-colors font-medium"
                >
                  {exporting === ('gsheet-' + b.id) ? '匯出中…' : 'Google Sheets'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
