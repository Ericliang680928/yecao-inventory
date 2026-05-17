import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: { fontSize: '15px', maxWidth: '90vw' },
        success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
      }}
    />
  </StrictMode>,
)
