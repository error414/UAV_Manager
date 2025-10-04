import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import './react-big-calendar.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
