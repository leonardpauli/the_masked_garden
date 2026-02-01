import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

// Hide loading spinner once React renders
const hideLoading = () => {
  const loading = document.getElementById('loading')
  if (loading) {
    loading.classList.add('hidden')
    setTimeout(() => loading.remove(), 300)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Hide loading after a short delay to ensure first paint
requestAnimationFrame(() => {
  requestAnimationFrame(hideLoading)
})
