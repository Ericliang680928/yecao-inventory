import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, useProvideAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import BatchList      from './pages/BatchList'
import CreateBatch    from './pages/CreateBatch'
import InventoryInput from './pages/InventoryInput'
import CategoryCount  from './pages/CategoryCount'
import ReviewPage     from './pages/ReviewPage'
import History        from './pages/History'
import AdminSync      from './pages/AdminSync'

function App() {
  const auth = useProvideAuth()

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/batches" element={
            <ProtectedRoute>
              <Layout>
                <BatchList />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/batches/new" element={
            <ProtectedRoute>
              <Layout>
                <CreateBatch />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/batches/:id" element={
            <ProtectedRoute>
              <InventoryInput />
            </ProtectedRoute>
          } />

          <Route path="/batches/:id/category" element={
            <ProtectedRoute>
              <CategoryCount />
            </ProtectedRoute>
          } />

          <Route path="/batches/:id/review" element={
            <ProtectedRoute>
              <Layout>
                <ReviewPage />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute>
              <Layout>
                <History />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/sync" element={
            <ProtectedRoute>
              <Layout>
                <AdminSync />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute>
              <Layout>
                <AdminSync />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
