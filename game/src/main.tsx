import React from 'react'
import ReactDOM from 'react-dom/client'
import { loadSliderDefaults } from './store/loadDefaults'

// Hide loading spinner once React renders
const hideLoading = () => {
  const loading = document.getElementById('loading')
  if (loading) {
    loading.classList.add('hidden')
    setTimeout(() => loading.remove(), 300)
  }
}

// Load defaults before importing App (which imports atoms)
loadSliderDefaults().then(async () => {
  // Dynamic import to ensure defaults are loaded before atoms are created
  const { App } = await import('./App')

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  // Hide loading after a short delay to ensure first paint
  requestAnimationFrame(() => {
    requestAnimationFrame(hideLoading)
  })
})
