import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell, DataError, DataLoading } from './components/Common'
import { usePokemonData } from './data/PokemonDataContext'
import PokemonDetailPage from './pages/PokemonDetailPage'
import PokemonListPage from './pages/PokemonListPage'
import TaskListPage from './pages/TaskListPage'
import TeamBuilderPage from './pages/TeamBuilderPage'

export default function App() {
  const { data, loading, error } = usePokemonData()

  return (
    <AppShell metadata={data?.metadata}>
      {loading && <DataLoading />}
      {error && <DataError error={error} />}
      {data && (
        <Routes>
          <Route path="/" element={<PokemonListPage />} />
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/team-builder" element={<TeamBuilderPage />} />
          <Route path="/pokemon/:pokemonId" element={<PokemonDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </AppShell>
  )
}
