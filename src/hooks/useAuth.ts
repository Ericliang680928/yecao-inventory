import { useState, useEffect, createContext, useContext } from 'react'
import type { User } from '../types'

interface AuthCtx {
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  isAdmin: boolean
  isReviewer: boolean
}

export const AuthContext = createContext<AuthCtx>({
  user: null, login: () => {}, logout: () => {}, isAdmin: false, isReviewer: false,
})

export function useProvideAuth(): AuthCtx {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })

  const login = (token: string, u: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return {
    user,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isReviewer: user?.role === 'reviewer' || user?.role === 'admin',
  }
}

export function useAuth() { return useContext(AuthContext) }
