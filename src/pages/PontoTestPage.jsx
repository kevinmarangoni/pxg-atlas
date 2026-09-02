import { ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

function useElapsedClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const startOfDay = new Date(now)
  startOfDay.setHours(9, 1, 37, 0)
  const elapsedMs = Math.max(0, now - startOfDay)
  const hours = String(Math.floor(elapsedMs / 3_600_000)).padStart(2, '0')
  const minutes = String(Math.floor((elapsedMs % 3_600_000) / 60_000)).padStart(2, '0')
  const seconds = String(Math.floor((elapsedMs % 60_000) / 1000)).padStart(2, '0')
  const dateLabel = now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return { hours, minutes, seconds, dateLabel }
}

export default function PontoTestPage() {
  const [clicked, setClicked] = useState(false)
  const { hours, minutes, seconds, dateLabel } = useElapsedClock()

  if (clicked) {
    return (
      <div style={styles.clickedScreen}>
        <h1 style={styles.clickedHeadline}>Botão foi clicado corretamente</h1>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.brandMark} />
          <span style={styles.brandWord}>PONTO</span>
        </div>
        <div style={styles.company}>
          <span style={styles.avatar}>EMP</span>
          <span style={styles.companyText}>
            <small style={styles.companyLabel}>Você está em</small>
            <strong style={styles.companyName}>EMPRESA DEMO LTDA</strong>
          </span>
          <ChevronDown size={18} color="#5b6472" />
        </div>
      </header>

      <main style={styles.main}>
        <p style={styles.greeting}>Olá!</p>
        <h1 style={styles.headline}>Não perca mais tempo,<br />registre seu ponto!</h1>

        <section style={styles.card}>
          <div style={styles.cardLeft}>
            <div style={styles.clock}>
              <span style={styles.clockValue}>{hours}<span style={styles.clockUnit}>h</span></span>
              <span style={styles.clockValue}>{minutes}<span style={styles.clockUnit}>m</span></span>
              <span style={styles.clockValue}>{seconds}<span style={styles.clockUnit}>s</span></span>
            </div>
            <p style={styles.dateLabel}>{dateLabel}</p>
          </div>
          <div style={styles.cardMiddle}>
            <button type="button" style={styles.ctaButton} onClick={() => setClicked(true)}>
              Registre seu ponto
              <ChevronRight size={16} />
            </button>
            <button type="button" style={styles.linkButton}>Registrar batida por pausa</button>
          </div>
          <div style={styles.illustration} aria-hidden="true">
            <svg viewBox="0 0 200 220" width="180" height="200">
              <circle cx="100" cy="46" r="34" fill="#241f47" />
              <rect x="55" y="80" width="90" height="90" rx="30" fill="#c9cdea" />
              <rect x="70" y="150" width="120" height="60" rx="10" fill="#3a4048" />
              <circle cx="150" cy="176" r="9" fill="#5b6472" />
            </svg>
          </div>
        </section>

        <section style={styles.banner}>
          <p style={styles.bannerText}>Não deixe de conferir a aplicação para o browser, ela irá agilizar seu dia a dia!</p>
          <button type="button" style={styles.bannerButton}>
            Quero conhecer
            <ChevronRight size={16} />
          </button>
        </section>
      </main>
    </div>
  )
}

const styles = {
  page: {
    position: 'fixed', inset: 0, overflowY: 'auto', background: '#f5f6f8',
    fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1c2430',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '22px clamp(20px, 4vw, 64px)', background: '#fff', borderBottom: '1px solid #e7e9ee',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandMark: { width: 26, height: 26, borderRadius: 8, border: '3px solid #14213d' },
  brandWord: { font: '800 20px Manrope, sans-serif', letterSpacing: '.02em', color: '#14213d' },
  company: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center',
    background: '#14213d', color: '#fff', fontSize: 11, fontWeight: 800, border: '2px solid #7fd6c2',
  },
  companyText: { display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'right' },
  companyLabel: { fontSize: 12, color: '#5b6472' },
  companyName: { fontSize: 14, color: '#1c2430' },
  main: { maxWidth: 1100, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 64px) 80px' },
  greeting: { margin: 0, fontSize: 15, color: '#4a5261' },
  headline: { margin: '6px 0 28px', font: '800 28px/1.3 Manrope, sans-serif', color: '#1c2430' },
  card: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
    background: '#fff', border: '1px solid #e7e9ee', borderRadius: 12, padding: '32px clamp(20px, 4vw, 40px)',
    overflow: 'hidden',
  },
  cardLeft: { display: 'flex', flexDirection: 'column', gap: 6 },
  clock: { display: 'flex', alignItems: 'baseline', gap: 14 },
  clockValue: { font: '800 40px Manrope, sans-serif', color: '#1c2430' },
  clockUnit: { fontSize: 16, fontWeight: 700, color: '#5b6472', marginLeft: 2 },
  dateLabel: { margin: 0, fontSize: 14, color: '#5b6472' },
  cardMiddle: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' },
  ctaButton: {
    display: 'inline-flex', alignItems: 'center', gap: 8, border: 0, borderRadius: 9,
    padding: '13px 22px', background: '#14425c', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  linkButton: { border: 0, background: 'transparent', color: '#14425c', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 },
  illustration: { marginLeft: 'auto' },
  banner: {
    marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
    background: '#eceef2', borderRadius: 12, padding: '24px clamp(20px, 4vw, 40px)',
  },
  bannerText: { margin: 0, maxWidth: 560, fontSize: 15, color: '#1c2430' },
  bannerButton: {
    display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #14425c', borderRadius: 9,
    padding: '11px 20px', background: 'transparent', color: '#14425c', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  clickedScreen: { position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#f5f6f8' },
  clickedHeadline: { margin: 0, padding: '0 24px', font: '800 clamp(24px, 4vw, 40px) Manrope, sans-serif', color: '#14425c', textAlign: 'center' },
}
