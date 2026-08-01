import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AtlasStorageProvider } from './data/AtlasStorageContext'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AtlasStorageProvider>
        <App />
      </AtlasStorageProvider>
    </HashRouter>
  </StrictMode>,
)
