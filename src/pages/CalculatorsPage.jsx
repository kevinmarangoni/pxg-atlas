import { Calculator, CircleDot, Clock, Coins, Search, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DataStamp, DomainState, PriceField, PriceProfileBar, ToolHero } from '../components/ToolCommon'
import { useAtlasStorage } from '../data/AtlasStorageContext'
import { useProgressionData } from '../data/DomainData'
import { PokemonDataProvider, usePokemonData } from '../data/PokemonDataContext'
import { displayName, pokemonCapture, pokemonElements, pokemonImage, pokemonPath, primaryLevel } from '../lib/pokemon'

const format = (value, digits = 0) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits })
function rateNumber(value) { return Number(String(value || '').replace(',', '.').match(/[\d.]+/)?.[0]) || 0 }
const ELEMENT_TERMS = {
  normal: ['normal', 'normal'], fire: ['fire', 'fogo'], water: ['water', 'agua', 'água'], electric: ['electric', 'eletrico', 'elétrico'], grass: ['grass', 'planta'], ice: ['ice', 'gelo'], fighting: ['fighting', 'lutador'], poison: ['poison', 'veneno'], ground: ['ground', 'terra'], flying: ['flying', 'voador'], psychic: ['psychic', 'psiquico', 'psíquico'], bug: ['bug', 'inseto'], rock: ['rock', 'pedra'], ghost: ['ghost', 'fantasma'], dragon: ['dragon', 'dragao', 'dragão'], dark: ['dark', 'sombrio'], steel: ['steel', 'aco', 'aço'], fairy: ['fairy', 'fada'], light: ['light', 'luz'], sound: ['sound', 'som'], cosmic: ['cosmic', 'cosmico', 'cósmico'], unknown: ['unknown', 'desconhecido'],
}
function ballCompatibility(ball, elements) {
  const text = `${ball.name || ''} ${ball.description || ''}`.toLocaleLowerCase('pt-BR')
  return elements.filter((element) => (ELEMENT_TERMS[element] || [element]).some((term) => text.includes(term)))
}
function experiencePercentage(tables, location, level) {
  const table = tables.find((entry) => location === 'nightmare' ? /within nightmare/i.test(entry.heading) : /outside of nightmare/i.test(entry.heading))
  for (const row of table?.rows || []) {
    const range = row[0] || ''
    const numbers = [...range.matchAll(/\d+/g)].map((match) => Number(match[0]))
    if (!numbers.length) continue
    const min = numbers[0]
    const max = range.includes('+') ? Infinity : (numbers[1] ?? numbers[0])
    if (level >= min && level <= max) return Number(String(row[1]).replace(',', '.').match(/[\d.]+/)?.[0]) || 100
  }
  return 100
}

function ExperienceCalculator({ data }) {
  const [track, setTrack] = useState('normal')
  const [start, setStart] = useState(1)
  const [target, setTarget] = useState(100)
  const [characterLevel, setCharacterLevel] = useState(100)
  const [location, setLocation] = useState('normal')
  const [rawPerHour, setRawPerHour] = useState('')
  const levels = data.experience.levels[track] || {}
  const max = Math.max(...Object.keys(levels).map(Number))
  const safeStart = Math.min(start, max)
  const safeTarget = Math.max(safeStart, Math.min(target, max))
  const required = Math.max(0, Number(levels[safeTarget] || 0) - Number(levels[safeStart] || 0))
  const percentage = experiencePercentage(data.experience.reductions || [], location, characterLevel)
  const effectivePerHour = (Number(rawPerHour) || 0) * percentage / 100
  const hours = effectivePerHour > 0 ? required / effectivePerHour : null
  return <section className="calculator-panel"><header><TrendingUp size={20} /><div><small>Progressão</small><h2>Calculadora de EXP</h2></div></header><div className="calculator-fields"><label><span>Tabela</span><select value={track} onChange={(event) => { const next = event.target.value; setTrack(next); const nextMax = next === 'nightmare' ? 100 : 600; setStart(Math.min(start, nextMax)); setTarget(Math.min(target, nextMax)) }}><option value="normal">Level normal</option><option value="nightmare">Nightmare Level</option></select></label><label><span>Level atual</span><input type="number" min="1" max={max} value={safeStart} onChange={(event) => setStart(Math.max(1, Number(event.target.value) || 1))} /></label><label><span>Level alvo</span><input type="number" min={safeStart} max={max} value={safeTarget} onChange={(event) => setTarget(Math.max(safeStart, Number(event.target.value) || safeStart))} /></label><label><span>Local da hunt</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="normal">Fora da Nightmare</option><option value="nightmare">Nightmare World</option></select></label><label><span>Level do personagem</span><input type="number" min="1" max="600" value={characterLevel} onChange={(event) => setCharacterLevel(Math.max(1, Number(event.target.value) || 1))} /></label><label><span>EXP bruta por hora</span><input type="number" min="0" value={rawPerHour} onChange={(event) => setRawPerHour(event.target.value)} placeholder="Opcional" /></label></div><div className="experience-result"><div><small>EXP necessária</small><strong>{format(required)}</strong></div><div><small>Percentual recebido</small><strong>{percentage}%</strong></div><div><small>EXP efetiva/h</small><strong>{effectivePerHour ? format(effectivePerHour) : '—'}</strong></div><div><small>Tempo estimado</small><strong>{hours === null ? 'Informe EXP/h' : `${format(hours, 1)} h`}</strong></div></div><p><Clock size={14} /> A redução usa o level do personagem e o local da hunt. Itens de bônus e stamina não são inferidos.</p></section>
}

function CaptureCalculatorContent({ data }) {
  const { pokemon } = usePokemonData()
  const { getPrice, setPrice } = useAtlasStorage()
  const [query, setQuery] = useState('Charizard')
  const [selectedId, setSelectedId] = useState('Charizard')
  const [playerLevel, setPlayerLevel] = useState(100)
  const [attempts, setAttempts] = useState(100)
  const candidates = useMemo(() => { const needle = query.trim().toLocaleLowerCase('pt-BR'); return pokemon.filter((entry) => displayName(entry).toLocaleLowerCase('pt-BR').includes(needle)).slice(0, 12) }, [pokemon, query])
  const selected = pokemon.find((entry) => entry.source_url.endsWith(`/index.php/${selectedId}`)) || candidates[0]
  const targetLevel = primaryLevel(selected)
  const capture = pokemonCapture(selected)
  const eligible = targetLevel != null && playerLevel >= targetLevel && !/sem sistema|não capturável|nao capturavel/i.test(`${capture?.official_difficulty || ''} ${capture?.difficulty || ''}`)
  const targetElements = pokemonElements(selected)
  return <section className="calculator-panel capture-calculator"><header><CircleDot size={20} /><div><small>Planejamento de custo</small><h2>Assistente de captura</h2></div></header><div className="capture-picker"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Pokémon" /></label><div>{candidates.map((entry) => <button type="button" className={entry === selected ? 'selected' : ''} key={entry.source_url} onClick={() => { setSelectedId(entry.source_url.split('/').pop()); setQuery(displayName(entry)) }}>{pokemonImage(entry) && <img src={pokemonImage(entry)} alt="" />}<span><strong>{displayName(entry)}</strong><small>Level {primaryLevel(entry) ?? '—'}</small></span></button>)}</div></div>{selected && <><div className="capture-target"><img src={pokemonImage(selected)} alt="" /><div><small>Alvo selecionado</small><h3>{displayName(selected)}</h3><Link to={pokemonPath(selected)}>Abrir ficha</Link></div><label><span>Seu level</span><input type="number" min="1" value={playerLevel} onChange={(event) => setPlayerLevel(Math.max(1, Number(event.target.value) || 1))} /></label><label><span>Tentativas</span><input type="number" min="1" value={attempts} onChange={(event) => setAttempts(Math.max(1, Number(event.target.value) || 1))} /></label><b className={eligible ? 'eligible' : 'ineligible'}>{eligible ? 'Catch System aplicável pelo level' : 'Catch System não confirmado'}</b></div><div className="ball-cost-grid">{data.balls.map((ball) => { const price = getPrice(ball.id); const total = price === '' ? null : Number(price) * attempts; const compatibleElements = ballCompatibility(ball, targetElements); return <article key={ball.id}>{ball.image_url && <img src={ball.image_url} alt="" />}<div><strong>{ball.name}</strong><small>Rate publicada: {ball.rate || '—'}</small>{targetElements.length > 0 && <small className={compatibleElements.length ? 'capture-compatible' : ''}>{compatibleElements.length ? `Compatível com: ${compatibleElements.join(' · ')}` : 'Sem compatibilidade elemental publicada'}</small>}<p>{ball.description}</p></div><PriceField item={ball.name} value={price} onChange={(value) => setPrice(ball.id, value)} /><output>{total === null ? 'Sem preço' : `${format(total, 2)}K`}</output></article>})}</div>{capture?.ball_averages && <details className="community-capture"><summary>Médias históricas da comunidade</summary><p>Estas médias são separadas do sistema oficial e podem estar desatualizadas.</p><div>{Object.entries(capture.ball_averages).filter(([, value]) => Number(value) > 0).map(([ball, value]) => <span key={ball}><strong>{ball}</strong><b>{format(value, 1)}</b></span>)}</div></details>}<p className="capture-formula-note"><Coins size={14} /> O Atlas compara multiplicador e custo, mas não exibe chance percentual: a fórmula oficial de captura não é publicada.</p></>}</section>
}

function CaptureCalculatorGate({ data }) {
  const pokemon = usePokemonData()
  return <DomainState loading={pokemon.loading} error={pokemon.error}><CaptureCalculatorContent data={data} /></DomainState>
}

function CaptureCalculator({ data }) {
  return <PokemonDataProvider><CaptureCalculatorGate data={data} /></PokemonDataProvider>
}

export default function CalculatorsPage() {
  const progression = useProgressionData()
  const { calculator } = useParams()
  const [tab, setTab] = useState(() => /captura|capture/i.test(calculator || '') ? 'capture' : 'experience')
  return <DomainState loading={progression.loading} error={progression.error}><div className="calculators-page page-frame"><ToolHero eyebrow="PLANEJAMENTO" title="Calculadoras oficiais" description="Faça projeções usando as tabelas publicadas, mantendo claramente separado o que é custo, regra oficial e estimativa comunitária."><Calculator size={50} /></ToolHero><DataStamp metadata={progression.data?.metadata} /><PriceProfileBar compact /><nav className="calculator-tabs"><button type="button" className={tab === 'experience' ? 'active' : ''} onClick={() => setTab('experience')}>Experiência</button><button type="button" className={tab === 'capture' ? 'active' : ''} onClick={() => setTab('capture')}>Captura</button></nav>{tab === 'experience' ? <ExperienceCalculator data={progression.data} /> : <CaptureCalculator data={progression.data} />}</div></DomainState>
}
