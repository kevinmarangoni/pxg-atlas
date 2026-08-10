import { Info, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { hasStorageConsent, onCookieConsentChange } from '../lib/cookieConsent'
import { useLanguage } from '../data/LanguageContext'
import { calculatePokemonRealPrice } from '../lib/pokemonPrice'

const PRICE_STORAGE_KEY = 'pxg-atlas:pokemon-price:v1'
const EMPTY_PRICE_VALUES = { diamondValue: '', diamondPriceBRL: '', pokemonPriceDollars: '' }

function readStoredPriceValues() {
  if (typeof window === 'undefined') return EMPTY_PRICE_VALUES
  try {
    const stored = JSON.parse(localStorage.getItem(PRICE_STORAGE_KEY) || 'null')
    return {
      diamondValue: stored?.diamondValue == null ? '' : String(stored.diamondValue),
      diamondPriceBRL: stored?.diamondPriceBRL == null ? '' : String(stored.diamondPriceBRL),
      pokemonPriceDollars: stored?.pokemonPriceDollars == null ? '' : String(stored.pokemonPriceDollars),
    }
  } catch {
    return EMPTY_PRICE_VALUES
  }
}

function PriceField({ label, value, onChange, suffix, hint, type = 'text', inputMode = 'decimal', placeholder }) {
  return (
    <label className="pokemon-price-field">
      <span>{label}</span>
      <div><input className={suffix ? 'has-suffix' : ''} type={type} min="0" step="0.01" inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" />{suffix && <b>{suffix}</b>}</div>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function PokemonPriceCalculator({ pokemonName }) {
  const { t } = useLanguage()
  const [values, setValues] = useState(readStoredPriceValues)
  const { diamondValue, diamondPriceBRL, pokemonPriceDollars } = values
  useEffect(() => {
    if (!hasStorageConsent()) return
    try { localStorage.setItem(PRICE_STORAGE_KEY, JSON.stringify(values)) } catch { /* storage is optional */ }
  }, [values])
  useEffect(() => onCookieConsentChange((decision) => { if (decision === 'declined') setValues(EMPTY_PRICE_VALUES) }), [])

  const updateValue = (field) => (value) => setValues((current) => ({ ...current, [field]: value }))
  const result = useMemo(() => calculatePokemonRealPrice({ diamondValue, diamondPriceBRL, pokemonPriceDollars }), [diamondValue, diamondPriceBRL, pokemonPriceDollars])
  const formattedResult = result == null ? null : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result)

  const reset = () => {
    setValues(EMPTY_PRICE_VALUES)
  }

  return (
    <div className="pokemon-price-calculator">
      <div className="pokemon-price-intro">
        <strong>{t('Converta o preço de {name}', { name: pokemonName })}</strong>
        <span>{t('Use a cotação do seu servidor para estimar o valor em reais.')}</span>
      </div>
      <div className="pokemon-price-fields">
        <PriceField
          label={t('Dólares do jogo por 1 Diamond')}
          value={diamondValue}
          onChange={updateValue('diamondValue')}
          inputMode="text"
          placeholder="187K"
          hint={t('Aceita K, KK ou KKK. Ex.: 187K, 2KK ou 1KKK.')}
        />
        <PriceField label={t('Preço de 1 Diamond')} value={diamondPriceBRL} onChange={updateValue('diamondPriceBRL')} suffix="R$" type="number" placeholder="0,00" />
        <PriceField label={t('Preço do Pokémon')} value={pokemonPriceDollars} onChange={updateValue('pokemonPriceDollars')} inputMode="text" placeholder="150KK" hint={t('Aceita K, KK ou KKK. Ex.: 187K, 2KK ou 1KKK.')} />
      </div>
      <div className="pokemon-price-result" aria-live="polite">
        <div><span>{t('Valor estimado em reais')}</span><strong>{formattedResult || t('Informe os três valores')}</strong></div>
        <small>{t('Fórmula: preço do Pokémon ÷ valor do Diamond × preço do Diamond.')}</small>
      </div>
      <div className="pokemon-price-footer">
        <p><Info size={13} />{t('A estimativa depende da cotação informada e não considera taxas ou variações do mercado.')}</p>
        <button type="button" onClick={reset}><RotateCcw size={13} />{t('Limpar valores')}</button>
      </div>
    </div>
  )
}
