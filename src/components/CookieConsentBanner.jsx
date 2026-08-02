import { Cookie } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../data/LanguageContext'
import { getCookieConsent, setCookieConsent } from '../lib/cookieConsent'

export function CookieConsentBanner() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(() => getCookieConsent() === null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!mounted) return
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [mounted])

  if (!mounted) return null

  const choose = (decision) => {
    setCookieConsent(decision)
    setEntered(false)
    setTimeout(() => setMounted(false), 320)
  }

  return (
    <div className={`cookie-consent ${entered ? 'is-visible' : ''}`} role="dialog" aria-live="polite" aria-label={t('Preferências de cookies')}>
      <div className="cookie-consent-copy">
        <Cookie size={20} />
        <p>
          {t('Usamos')} <code>localStorage</code> {t('no seu navegador para lembrar preferências como tema, time montado e progresso de trackers — nada é enviado para servidores externos. Você pode mudar de ideia quando quiser em')}{' '}
          <Link to="/legal#privacy">{t('Avisos legais')}</Link>.
        </p>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="button secondary" onClick={() => choose('declined')}>{t('Recusar')}</button>
        <button type="button" className="button primary" onClick={() => choose('accepted')}>{t('Aceitar')}</button>
      </div>
    </div>
  )
}
