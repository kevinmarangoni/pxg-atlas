import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AtlasStorageProvider } from './data/AtlasStorageContext'
import { LanguageProvider } from './data/LanguageContext'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <LanguageProvider>
        <AtlasStorageProvider>
          <App />
        </AtlasStorageProvider>
      </LanguageProvider>
    </HashRouter>
  </StrictMode>,
)
