import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({ baseURL: '/api' })

// 自動帶 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 統一錯誤處理
api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || '網路錯誤，請稍後再試'
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else if (err.response?.status !== 409) {
      // 409 衝突讓呼叫方自行處理
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

export default api
