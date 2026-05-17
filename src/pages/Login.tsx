import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/client'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) { toast.error('請輸入帳號與密碼'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { username, password })
      login(res.data.token, res.data.user)
      toast.success(`歡迎，${res.data.user.name}！`)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🌾</div>
          <h1 className="text-white text-2xl font-bold">野草倉庫盤點系統</h1>
          <p className="text-primary-200 text-sm mt-1">請登入以繼續</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">帳號</label>
              <input
                type="text"
                className="input-field"
                placeholder="請輸入帳號"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
              <input
                type="password"
                className="input-field"
                placeholder="請輸入密碼"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? '登入中…' : '登 入'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
