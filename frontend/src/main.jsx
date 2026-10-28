import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/i18n'
import 'react-loading-skeleton/dist/skeleton.css'
import '@/styles/index.css'
import '@/modules/discovery/hero/hero.css'
import '@/components/layout/publicHeader.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
