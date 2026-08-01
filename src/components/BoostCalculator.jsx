import { Calculator, Coins, Info, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { calculateBoostCost, formatK, materiaNamesFromMatter, parseBoostProfile } from '../lib/boostCalculator'

const STORAGE_KEY = 'pxg-atlas:boost-prices:v1'

function readStoredPrices() {
  if (typeof window === 'undefined') return { stones: {}, materia: {}, boostStone: '', poweredBoostStone: '', pinkStarPiece: '' }
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      stones: saved.stones || {},
      materia: saved.materia || {},
      boostStone: saved.boostStone ?? '',
      poweredBoostStone: saved.poweredBoostStone ?? '',
      pinkStarPiece: saved.pinkStarPiece ?? '',
    }
  } catch {
    return { stones: {}, materia: {}, boostStone: '', poweredBoostStone: '', pinkStarPiece: '' }
  }
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString('pt-BR')
}

function PriceInput({ label, value, onChange, hint }) {
  return (
    <label className="boost-price-field">
      <span>{label}</span>
      <div><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Preço em K" /><b>K</b></div>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function BoostCalculator({ boost, matter }) {
  const profile = useMemo(() => parseBoostProfile(boost), [boost])
  const materiaNames = useMemo(() => materiaNamesFromMatter(matter), [matter])
  const [startBoost, setStartBoost] = useState(0)
  const [targetBoost, setTargetBoost] = useState(50)
  const [prices, setPrices] = useState(readStoredPrices)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prices))
  }, [prices])

  const result = useMemo(() => calculateBoostCost({
    profile,
    startBoost,
    targetBoost,
    materialPrices: prices.stones,
    materiaPrices: prices.materia,
    boostStonePrice: prices.boostStone,
    poweredBoostStonePrice: prices.poweredBoostStone,
    pinkStarPiecePrice: prices.pinkStarPiece,
  }), [profile, startBoost, targetBoost, prices])

  if (!profile.valid) {
    return (
      <section className="detail-section boost-calculator unavailable" id="boost-cost">
        <div className="detail-section-heading">
          <div className="detail-section-title"><Calculator size={18} /><h2>Custo para upar</h2></div>
          <p>A ficha não publicou um perfil de boost calculável para esta forma.</p>
        </div>
        <div className="detail-empty-state"><span><Info size={20} /></span><div><strong>Boost não informado</strong><p>Quando a Wiki informar a stone e o intervalo do boost, os custos aparecerão aqui.</p></div></div>
      </section>
    )
  }

  const updateStonePrice = (material, value) => setPrices((current) => ({ ...current, stones: { ...current.stones, [material]: value } }))
  const updateMateriaPrice = (material, value) => setPrices((current) => ({ ...current, materia: { ...current.materia, [material]: value } }))
  const resetPrices = () => setPrices({ stones: {}, materia: {}, boostStone: '', poweredBoostStone: '', pinkStarPiece: '' })
  const currentLabel = startBoost === 0 ? '+0' : `+${startBoost}`
  const targetLabel = `+${targetBoost}`
  const hasExtended = targetBoost > 50
  const totalKnown = result.costKnown && !result.missingPrice
  const selectedMaterialLabel = result.material && prices.stones[result.material] !== undefined && prices.stones[result.material] !== '' ? result.material : profile.materials.join(' ou ')
  const selectedMateriaLabel = result.materiaMaterial && result.materiaMaterial !== 'Materia do clã/tier' && prices.materia[result.materiaMaterial] !== undefined && prices.materia[result.materiaMaterial] !== '' ? result.materiaMaterial : materiaNames.join(' ou ')

  return (
    <section className="detail-section boost-calculator" id="boost-cost">
      <div className="detail-section-heading">
        <div className="detail-section-title"><Calculator size={18} /><h2>Custo para upar</h2></div>
        <p>Veja quantas stones este Pokémon consome e simule o custo com os preços do market do seu servidor. Os valores ficam salvos somente neste navegador.</p>
      </div>

      <div className="boost-profile-banner">
        <div><span>Perfil publicado</span><strong>{profile.materialText}</strong></div>
        <b>Tipo {profile.boostType}</b>
        {profile.special && <small>Regra especial: Ancient, Metal e Crystal Stone.</small>}
      </div>

      <div className="boost-controls">
        <label><span>Boost atual</span><select value={startBoost} onChange={(event) => { const next = Number(event.target.value); setStartBoost(next); setTargetBoost((current) => Math.max(current, next)) }}>{Array.from({ length: 81 }, (_, value) => <option key={value} value={value}>+{value}</option>)}</select></label>
        <label><span>Upar até</span><select value={targetBoost} onChange={(event) => setTargetBoost(Math.max(startBoost, Number(event.target.value)))}>{Array.from({ length: 81 }, (_, value) => <option key={value} value={value}>+{value}</option>)}</select></label>
        <button type="button" className="boost-reset" onClick={resetPrices}><RotateCcw size={14} /> Limpar preços</button>
      </div>

      <div className="boost-price-groups">
        <div className="boost-price-group">
          <header><Coins size={15} /><div><strong>Preços das stones</strong><span>Informe em K. Em alternativas, usamos automaticamente a opção mais barata preenchida.</span></div></header>
          <div className="boost-price-grid">
            {profile.materials.map((material) => <PriceInput key={material} label={material} value={prices.stones[material] ?? ''} onChange={(value) => updateStonePrice(material, value)} />)}
            <PriceInput label="Boost Stone (opcional)" value={prices.boostStone} onChange={(value) => setPrices((current) => ({ ...current, boostStone: value }))} hint="Usada quando sair mais barata que as stones comuns." />
          </div>
        </div>

        {hasExtended && <div className="boost-price-group">
          <header><Coins size={15} /><div><strong>Materiais de +50 a +80</strong><span>Os nomes abaixo vêm do clã/tier publicado na ficha.</span></div></header>
          <div className="boost-price-grid">
            {materiaNames.map((material) => <PriceInput key={material} label={material} value={prices.materia[material] ?? ''} onChange={(value) => updateMateriaPrice(material, value)} />)}
            <PriceInput label="Powered Boost Stone (opcional)" value={prices.poweredBoostStone} onChange={(value) => setPrices((current) => ({ ...current, poweredBoostStone: value }))} hint="Alternativa para cada boost entre +50 e +70." />
            {targetBoost > 70 && <PriceInput label="Pink Star Piece" value={prices.pinkStarPiece} onChange={(value) => setPrices((current) => ({ ...current, pinkStarPiece: value }))} />}
          </div>
        </div>}
      </div>

      <div className="boost-result">
        <div className="boost-result-heading"><div><span>Estimativa de {currentLabel} até {targetLabel}</span><strong>{totalKnown ? formatK(result.totalCost) : 'Informe os preços para calcular'}</strong></div><small>custo total</small></div>
        <div className="boost-result-grid">
          <div><span>{selectedMaterialLabel}</span><strong>{formatQuantity(result.normalStones)}</strong><small>stones comuns</small></div>
          <div><span>Boost Stone</span><strong>{formatQuantity(result.boostStones)}</strong><small>quando a troca compensa</small></div>
          {result.materia > 0 && <div><span>{selectedMateriaLabel}</span><strong>{formatQuantity(result.materia)}</strong><small>materiais de boost</small></div>}
          {result.pinkStarPieces > 0 && <div><span>Pink Star Piece</span><strong>{formatQuantity(result.pinkStarPieces)}</strong><small>de +70 a +80</small></div>}
        </div>
        {!totalKnown && <p className="boost-result-note"><Info size={14} /> As quantidades são calculadas mesmo sem preço. Preencha os campos usados no intervalo escolhido para ver o total.</p>}
        <p className="boost-result-note">Fórmula baseada nas tabelas oficiais de boost; o custo é uma simulação e não considera taxas ou variações do market.</p>
      </div>
    </section>
  )
}
