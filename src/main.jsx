import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import App from './App.jsx'
import './index.css'
import './styles/design-system.css'  // 👈 Design System الجديد
import './styles/components.css'     // 👈 مكونات محترفة
import './styles/pages.css'          // 👈 صفحات محترفة
import './config/i18n'  // 👈 مهم

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
)
