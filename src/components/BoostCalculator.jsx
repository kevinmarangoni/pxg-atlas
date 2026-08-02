import { Calculator, Coins, Info, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAtlasStorage } from '../data/AtlasStorageContext'
import { useLanguage } from '../data/LanguageContext'
import { calculateBoostCost, formatK, materiaNamesFromMatter, parseBoostProfile } from '../lib/boostCalculator'

function formatQuantity(value, locale) {
  return Number(value || 0).toLocaleString(locale)
}

function PriceInput({ label, value, onChange, hint }) {
  const { t } = useLanguage()
  return (
    <label className="boost-price-field">
      <span>{label}</span>
      <div><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder={t('Preço em K')} /><b>K</b></div>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function BoostCalculator({ boost, matter, compact = false }) {
  const { t, locale } = useLanguage()
  const profile = useMemo(() => parseBoostProfile(boost), [boost])
  const materiaNames = useMemo(() => materiaNamesFromMatter(matter), [matter])
  const { activePriceProfile, getPrice, setPrice, clearActivePrices } = useAtlasStorage()
  const [startBoost, setStartBoost] = useState(0)
  const [targetBoost, setTargetBoost] = useState(50)
  const prices = useMemo(() => ({
    stones: Object.fromEntries((profile.materials || []).map((material) => [material, getPrice(material)])),
    materia: Object.fromEntries(materiaNames.map((material) => [material, getPrice(material)])),
    boostStone: getPrice('Boost Stone'),
    poweredBoostStone: getPrice('Powered Boost Stone'),
    pinkStarPiece: getPrice('Pink Star Piece'),
  }), [profile, materiaNames, getPrice, activePriceProfile])

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
    if (compact) return null
    return (
      <section className="detail-section boost-calculator unavailable" id="boost-cost">
        <div className="detail-section-heading">
          <div className="detail-section-title"><Calculator size={18} /><h2>{t('Custo para upar')}</h2></div>
          <p>{t('A ficha não publicou um perfil de boost calculável para esta forma.')}</p>
        </div>
        <div className="detail-empty-state"><span><Info size={20} /></span><div><strong>{t('Boost não informado')}</strong><p>{t('Quando a Wiki informar a stone e o intervalo do boost, os custos aparecerão aqui.')}</p></div></div>
      </section>
    )
  }

  const updateStonePrice = (material, value) => setPrice(material, value)
  const updateMateriaPrice = (material, value) => setPrice(material, value)
  const resetPrices = clearActivePrices
  const currentLabel = startBoost === 0 ? '+0' : `+${startBoost}`
  const targetLabel = `+${targetBoost}`
  const hasExtended = targetBoost > 50
  const totalKnown = result.costKnown && !result.missingPrice
  const selectedMaterialLabel = result.material && prices.stones[result.material] !== undefined && prices.stones[result.material] !== '' ? result.material : profile.materials.join(' ou ')
  const selectedMateriaLabel = result.materiaMaterial && result.materiaMaterial !== 'Materia do clã/tier' && prices.materia[result.materiaMaterial] !== undefined && prices.materia[result.materiaMaterial] !== '' ? result.materiaMaterial : materiaNames.join(' ou ')

  return (
    <section className={`detail-section boost-calculator ${compact ? 'boost-calculator--compact' : ''}`} id={compact ? undefined : 'boost-cost'}>
      {!compact && (
        <div className="detail-section-heading">
          <div className="detail-section-title"><Calculator size={18} /><h2>{t('Custo para upar')}</h2></div>
          <p>{t('Veja quantas stones este Pokémon consome e simule o custo com os preços do market do seu servidor. Os valores ficam salvos somente neste navegador.')}</p>
        </div>
      )}

      <div className="boost-profile-banner">
        <div><span>{t('Perfil publicado')}</span><strong>{profile.materialText}</strong></div>
        <b>{t('Tipo {type}', { type: profile.boostType })}</b>
        {profile.special && <small>{t('Regra especial: Ancient, Metal e Crystal Stone.')}</small>}
      </div>

      <div className="boost-controls">
        <label><span>{t('Boost atual')}</span><select value={startBoost} onChange={(event) => { const next = Number(event.target.value); setStartBoost(next); setTargetBoost((current) => Math.max(current, next)) }}>{Array.from({ length: 81 }, (_, value) => <option key={value} value={value}>+{value}</option>)}</select></label>
        <label><span>{t('Upar até')}</span><select value={targetBoost} onChange={(event) => setTargetBoost(Math.max(startBoost, Number(event.target.value)))}>{Array.from({ length: 81 }, (_, value) => <option key={value} value={value}>+{value}</option>)}</select></label>
        <button type="button" className="boost-reset" onClick={resetPrices}><RotateCcw size={14} /> {t('Limpar preços')}</button>
      </div>

      <div className="boost-price-groups">
        <div className="boost-price-group">
          <header><Coins size={15} /><div><strong>{t('Preços das stones')}</strong><span>{t('Informe em K. Em alternativas, usamos automaticamente a opção mais barata preenchida.')}</span></div></header>
          <div className="boost-price-grid">
            {profile.materials.map((material) => <PriceInput key={material} label={material} value={prices.stones[material] ?? ''} onChange={(value) => updateStonePrice(material, value)} />)}
            <PriceInput label={t('Boost Stone (opcional)')} value={prices.boostStone} onChange={(value) => setPrice('Boost Stone', value)} hint={t('Usada quando sair mais barata que as stones comuns.')} />
          </div>
        </div>

        {hasExtended && <div className="boost-price-group">
          <header><Coins size={15} /><div><strong>{t('Materiais de +50 a +80')}</strong><span>{t('Os nomes abaixo vêm do clã/tier publicado na ficha.')}</span></div></header>
          <div className="boost-price-grid">
            {materiaNames.map((material) => <PriceInput key={material} label={material} value={prices.materia[material] ?? ''} onChange={(value) => updateMateriaPrice(material, value)} />)}
            <PriceInput label={t('Powered Boost Stone (opcional)')} value={prices.poweredBoostStone} onChange={(value) => setPrice('Powered Boost Stone', value)} hint={t('Alternativa para cada boost entre +50 e +70.')} />
            {targetBoost > 70 && <PriceInput label="Pink Star Piece" value={prices.pinkStarPiece} onChange={(value) => setPrice('Pink Star Piece', value)} />}
          </div>
        </div>}
      </div>

      <div className="boost-result">
        <div className="boost-result-heading"><div><span>{t('Estimativa de {from} até {to}', { from: currentLabel, to: targetLabel })}</span><strong>{totalKnown ? formatK(result.totalCost) : t('Informe os preços para calcular')}</strong></div><small>{t('custo total')}</small></div>
        <div className="boost-result-grid">
          <div><span>{selectedMaterialLabel}</span><strong>{formatQuantity(result.normalStones, locale)}</strong><small>{t('stones comuns')}</small></div>
          <div><span>Boost Stone</span><strong>{formatQuantity(result.boostStones, locale)}</strong><small>{t('quando a troca compensa')}</small></div>
          {result.materia > 0 && <div><span>{selectedMateriaLabel}</span><strong>{formatQuantity(result.materia, locale)}</strong><small>{t('materiais de boost')}</small></div>}
          {result.pinkStarPieces > 0 && <div><span>Pink Star Piece</span><strong>{formatQuantity(result.pinkStarPieces, locale)}</strong><small>{t('de +70 a +80')}</small></div>}
        </div>
        {!totalKnown && <p className="boost-result-note"><Info size={14} /> {t('As quantidades são calculadas mesmo sem preço. Preencha os campos usados no intervalo escolhido para ver o total.')}</p>}
        <p className="boost-result-note">{t('Fórmula baseada nas tabelas oficiais de boost; o custo é uma simulação e não considera taxas ou variações do market.')}</p>
      </div>
    </section>
  )
}
