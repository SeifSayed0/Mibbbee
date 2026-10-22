import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './styles/tokens.css'
import './styles/global.css'
import './styles/professional.css'
import { registerMineServiceWorker } from './services/serviceWorker'

void registerMineServiceWorker().then(status => window.dispatchEvent(new CustomEvent('mine-sw-status', { detail: status })))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
