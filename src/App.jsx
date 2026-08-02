import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AppShell, DataError, DataLoading } from './components/Common'
import { PokemonDataProvider, usePokemonData } from './data/PokemonDataContext'
import { MapDataProvider } from './data/MapDataContext'
import PokemonDetailPage from './pages/PokemonDetailPage'
import PokemonListPage from './pages/PokemonListPage'
import LegalPage from './pages/LegalPage'
import MapPage from './pages/MapPage'
import TaskListPage from './pages/TaskListPage'
import TeamBuilderPage from './pages/TeamBuilderPage'
import ToolsPage from './pages/ToolsPage'
import ItemListPage from './pages/ItemListPage'
import ItemDetailPage from './pages/ItemDetailPage'
import CraftingPage from './pages/CraftingPage'
import HeldItemsPage from './pages/HeldItemsPage'
import PokelogPage from './pages/PokelogPage'
import QuestsPage from './pages/QuestsPage'
import NpcsPage from './pages/NpcsPage'
import BossesPage from './pages/BossesPage'
import BerriesPage from './pages/BerriesPage'
import CalculatorsPage from './pages/CalculatorsPage'
import UnownTrackerPage from './pages/UnownTrackerPage'

function PokemonDataGate({ children }) {
  const { data, loading, error } = usePokemonData()
  if (loading) return <DataLoading />
  if (error) return <DataError error={error} />
  return data ? children : null
}

function PokemonRoute({ children, withMap = false }) {
  const content = <PokemonDataProvider><PokemonDataGate>{children}</PokemonDataGate></PokemonDataProvider>
  return withMap ? <MapDataProvider>{content}</MapDataProvider> : content
}

function HashRouteSync() {
  const location = useLocation()

  useEffect(() => {
    const hashPath = window.location.hash.replace(/^#/, '') || '/'
    const routerPath = `${location.pathname}${location.search}${location.hash}` || '/'
    if (hashPath === routerPath) return

    // A click during the first render can update the URL before HashRouter
    // subscribes to hashchange. Re-emit it so the route catches up to the URL.
    try {
      window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: window.location.href, newURL: window.location.href }))
    } catch {
      window.dispatchEvent(new Event('hashchange'))
    }
  }, [location.hash, location.pathname, location.search])

  return null
}

export default function App() {
  return (
    <AppShell>
      <HashRouteSync />
      <Routes>
        <Route path="/" element={<PokemonRoute><PokemonListPage /></PokemonRoute>} />
        <Route path="/tasks" element={<PokemonRoute><TaskListPage /></PokemonRoute>} />
        <Route path="/map" element={<PokemonRoute withMap><MapPage /></PokemonRoute>} />
        <Route path="/team-builder" element={<PokemonRoute><TeamBuilderPage /></PokemonRoute>} />
        <Route path="/pokemon/:pokemonId" element={<PokemonRoute withMap><PokemonDetailPage /></PokemonRoute>} />
        <Route path="/pokelog" element={<PokemonRoute withMap><PokelogPage /></PokemonRoute>} />
        <Route path="/unowns" element={<PokemonRoute><UnownTrackerPage /></PokemonRoute>} />
        <Route path="/unown-tracker" element={<PokemonRoute><UnownTrackerPage /></PokemonRoute>} />
        <Route path="/npcs" element={<PokemonRoute><NpcsPage /></PokemonRoute>} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/items" element={<ItemListPage />} />
        <Route path="/items/:itemId" element={<ItemDetailPage />} />
        <Route path="/crafting" element={<CraftingPage />} />
        <Route path="/held-items" element={<HeldItemsPage />} />
        <Route path="/quests" element={<QuestsPage />} />
        <Route path="/bosses" element={<BossesPage />} />
        <Route path="/berries" element={<BerriesPage />} />
        <Route path="/calculators" element={<CalculatorsPage />} />
        <Route path="/calculators/:calculator" element={<CalculatorsPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
