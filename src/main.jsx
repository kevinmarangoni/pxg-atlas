import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { PokemonDataProvider } from './data/PokemonDataContext'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <PokemonDataProvider>
        <App />
      </PokemonDataProvider>
    </HashRouter>
  </StrictMode>,
)
