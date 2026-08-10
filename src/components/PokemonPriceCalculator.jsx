import { Info, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLanguage } from '../data/LanguageContext'
import { calculatePokemonRealPrice } from '../lib/pokemonPrice'

function PriceField({ label, value, onChange, suffix, hint }) {
  return (
    <label className="pokemon-price-field">
      <span>{label}</span>
      <div><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /><b>{suffix}</b></div>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function PokemonPriceCalculator({ pokemonName }) {
  const { t } = useLanguage()
  const [diamondValue, setDiamondValue] = useState('')
  const [diamondPriceBRL, setDiamondPriceBRL] = useState('')
  const [pokemonPriceDollars, setPokemonPriceDollars] = useState('')
  const result = useMemo(() => calculatePokemonRealPrice({ diamondValue, diamondPriceBRL, pokemonPriceDollars }), [diamondValue, diamondPriceBRL, pokemonPriceDollars])
  const formattedResult = result == null ? null : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(result)

  const reset = () => {
    setDiamondValue('')
    setDiamondPriceBRL('')
    setPokemonPriceDollars('')
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
          onChange={setDiamondValue}
          suffix="D"
          hint={t('Quanto a unidade de Diamond vale na moeda do jogo.')}
        />
        <PriceField label={t('Preço de 1 Diamond')} value={diamondPriceBRL} onChange={setDiamondPriceBRL} suffix="R$" />
        <PriceField label={t('Preço do Pokémon')} value={pokemonPriceDollars} onChange={setPokemonPriceDollars} suffix="D" />
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
