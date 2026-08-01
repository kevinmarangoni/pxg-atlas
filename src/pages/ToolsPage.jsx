import { Calculator, ClipboardList, Download, FlaskConical, Gem, MapPinned, PackageSearch, ShieldCheck, Sprout, Upload, Wrench } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PriceProfileBar, ToolHero } from '../components/ToolCommon'
import { useAtlasStorage } from '../data/AtlasStorageContext'

const TOOLS = [
  { to: '/items', icon: PackageSearch, title: 'ItemDex', description: 'Itens, origens, drops e relações de crafting.' },
  { to: '/crafting', icon: Wrench, title: 'Planejador de crafting', description: 'Inventário, materiais faltantes e custo por servidor.' },
  { to: '/held-items', icon: Gem, title: 'Held Items', description: 'Compare tiers, efeitos e usos recomendados.' },
  { to: '/pokelog', icon: ClipboardList, title: 'Pokélog', description: 'Acompanhe o progresso global e encontre respawns.' },
  { to: '/quests', icon: MapPinned, title: 'Quests', description: 'Requisitos, recompensas e spoilers controlados.' },
  { to: '/bosses', icon: ShieldCheck, title: 'Bosses', description: 'Conteúdo semanal e checklist por boss.' },
  { to: '/berries', icon: Sprout, title: 'BerryDex', description: 'Efeitos, plantio e temporizadores.' },
  { to: '/calculators', icon: Calculator, title: 'Calculadoras', description: 'EXP, Nightmare e assistência de captura.' },
]

export default function ToolsPage() {
  const { state, importBackup } = useAtlasStorage()
  const inputRef = useRef(null)
  const [message, setMessage] = useState('')
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `pxg-atlas-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage('Backup exportado.')
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      if (payload?.version !== 2) throw new Error('Versão de backup incompatível.')
      importBackup(payload, false)
      setMessage('Backup importado e mesclado com os dados atuais.')
    } catch (error) { setMessage(error.message) }
    event.target.value = ''
  }

  return (
    <div className="tools-page page-frame">
      <ToolHero eyebrow="CENTRAL DO JOGADOR" title="Ferramentas do PXG Atlas" description="Catálogos e planejadores conectados à mesma base oficial e aos preços do market do seu servidor.">
        <FlaskConical size={50} />
      </ToolHero>
      <PriceProfileBar />
      <div className="tools-grid">
        {TOOLS.map(({ to, icon: Icon, title, description }) => <Link to={to} className="tool-card" key={to}><span><Icon size={22} /></span><div><strong>{title}</strong><p>{description}</p></div></Link>)}
      </div>
      <section className="backup-panel">
        <div><small>Backup local</small><h2>Leve seus dados com você</h2><p>Exporta perfis de preço, crafting, Pokélog, quests, bosses e timers. A importação mescla registros sem apagar o que já existe.</p></div>
        <div><button type="button" onClick={exportBackup}><Download size={16} />Exportar JSON</button><button type="button" onClick={() => inputRef.current?.click()}><Upload size={16} />Importar JSON</button><input ref={inputRef} type="file" accept="application/json" onChange={importFile} hidden /></div>
        {message && <output>{message}</output>}
      </section>
    </div>
  )
}

