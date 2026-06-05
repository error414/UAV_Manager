import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import './react-big-calendar.css'
import App from './App.jsx'
import { initTheme } from '../utils/themeUtils'

// Apply the stored theme before first paint to avoid a flash of light mode.
initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
