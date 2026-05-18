import { useEffect, useState } from 'react'

interface User {
  username: string
  name: string
  role: string
  active: string
}

const ROLE_LABEL: Record<string, string> = {
  admin:    '管理員',
  counter:  '操作員',
  reviewer: '覆核員',
}

const ROLE_COLOR: Record<string, string> = {
  admin:    'bg-purple-100 text-purple-700',
  counter:  'bg-blue-100 text-blue-700',
  reviewer: 'bg-green-100 text-green-700',
}

export default function Users() {
  const token = localStorage.getItem('token')
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    username: '', name: '', password: '', role: 'counter',
  })

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/users', { headers })
      if (!r.ok) throw new Error((await r.json()).error || '讀取失敗')
      setUsers(await r.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setFormError('')
    try {
      const r = await fetch('/api/users', {
        method: 'POST', headers,
        body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error((await r.json()).error || '建立失敗')
      setShowForm(false)
      setForm({ username: '', name: '', password: '', role: 'counter' })
      await load()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (username: string, currentActive: string) => {
    const newActive = currentActive === 'TRUE' ? 'FALSE' : 'TRUE'
    try {
      const r = await fetch(`/api/users/${username}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ active: newActive }),
      })
      if (!r.ok) throw new Error((await r.json()).error || '更新失敗')
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">使用者管理</h1>
        <button
          onClick={() => { setShowForm(true); setFormError('') }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + 新增人員
        </button>
      </div>

      {/* 新增表單 */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">新增操作人員</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">帳號 <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="登入帳號"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">姓名 <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="顯示名稱"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">密碼 <span className="text-red-500">*</span></label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="初始密碼"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">角色</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="counter">操作員（盤點）</option>
                  <option value="reviewer">覆核員</option>
                  <option value="admin">管理員</option>
                </select>
              </div>
            </div>
            {formError && <p className="text-red-600 text-sm">{formError}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >取消</button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >{saving ? '建立中…' : '建立帳號'}</button>
            </div>
          </form>
        </div>
      )}

      {/* 使用者清單 */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">載入中…</p>
      ) : error ? (
        <p className="text-red-500 text-center py-12">{error}</p>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.username}
              className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm
                ${u.active === 'FALSE' ? 'opacity-50' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{u.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                  {u.active === 'FALSE' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">已停用</span>
                  )}
                </div>
                <p className="text-sm text-gray-400">帳號：{u.username}</p>
              </div>
              <button
                onClick={() => toggleActive(u.username, u.active)}
                className={`text-xs px-3 py-1 rounded-lg border transition-colors
                  ${u.active === 'FALSE'
                    ? 'border-green-400 text-green-600 hover:bg-green-50'
                    : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}
              >
                {u.active === 'FALSE' ? '啟用' : '停用'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
