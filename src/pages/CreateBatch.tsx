import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function CreateBatch() {
  const today = new Date().toISOString().split('T')[0]
  const [date,  setDate]  = useState(today)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!date) { toast.error('請選擇盤點日期'); return }
    setLoading(true)
    try {
      const res = await api.post('/batches', { date, notes })
      toast.success('批次建立成功，正在準備盤點清單…')
      navigate(`/batches/${res.data.id}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="pt-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 text-sm mb-2">← 返回</button>
        <h2 className="text-xl font-bold text-gray-800">建立盤點批次</h2>
        <p className="text-sm text-gray-500 mt-1">建立後系統將自動帶入所有產品，請選擇日期後開始盤點</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              盤點日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input-field text-lg"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">備註（選填）</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="例如：月底盤點、新品上架後盤點…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-lg py-4"
            >
              {loading ? '建立中，請稍候…' : '建立並開始盤點'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              建立後系統將自動同步產品清單（約需 10-30 秒）
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
