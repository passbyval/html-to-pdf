import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'

import './App.css'
import './index.css'

hydrateRoot(
  document.getElementById('root'),
  <StrictMode>
    <App />
  </StrictMode>
)

