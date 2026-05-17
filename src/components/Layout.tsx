import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/',         label: '首頁',   icon: '🏠' },
  { to: '/batches',  label: '盤點',   icon: '📋' },
  { to: '/history',  label: '歷史',   icon: '📜' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span>🌾</span>
          <span className="hidden sm:inline">野草盤點系統</span>
          <span className="sm:hidden">野草盤點</span>
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/sync" className="text-sm bg-primary-600 px-3 py-1 rounded-lg hover:bg-primary-500 transition-colors">
              同步
            </Link>
          )}
          <span className="text-sm opacity-80">{user?.name}</span>
          <button onClick={handleLogout} className="text-sm bg-primary-600 px-3 py-1 rounded-lg hover:bg-primary-500 transition-colors">
            登出
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40 shadow-lg">
        {NAV.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors touch-manipulation
              ${location.pathname === item.to
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            to="/admin"
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors touch-manipulation
              ${location.pathname.startsWith('/admin')
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="text-xl">⚙️</span>
            管理
          </Link>
        )}
      </nav>
    </div>
  )
}
