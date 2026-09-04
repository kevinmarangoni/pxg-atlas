import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../data/LanguageContext'
import { useChatMessages } from '../hooks/useChatMessages'
import { getChatName, setChatName } from '../lib/chatIdentity'

const SEND_COOLDOWN_MS = 4000

function timeLabel(timestamp, locale) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export function ChatWidget() {
  const { t, locale } = useLanguage()
  const { messages, sendMessage, maxTextLength, maxNameLength } = useChatMessages()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(getChatName)
  const [text, setText] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const listRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [open, messages])

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [cooldownUntil])

  const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const onCooldown = cooldownRemaining > 0

  const commitName = (value) => {
    const trimmed = value.trim().slice(0, maxNameLength)
    setName(trimmed)
    setChatName(trimmed)
  }

  const submit = (event) => {
    event.preventDefault()
    if (onCooldown || !text.trim()) return
    sendMessage(name, text)
    setText('')
    setCooldownUntil(Date.now() + SEND_COOLDOWN_MS)
  }

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" role="dialog" aria-label={t('Mural da comunidade')}>
          <header className="chat-panel-header">
            <span>{t('Mural da comunidade')}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('Fechar mural da comunidade')}><X size={16} /></button>
          </header>

          <div className="chat-messages" ref={listRef}>
            {messages === null ? null : messages.length === 0 ? (
              <p className="chat-empty">{t('Seja o primeiro a deixar uma mensagem!')}</p>
            ) : messages.map((message) => (
              <div className="chat-message" key={message.id}>
                <strong>{message.name}</strong>
                <time>{timeLabel(message.timestamp, locale)}</time>
                <p>{message.text}</p>
              </div>
            ))}
          </div>

          <div className="chat-name-row">
            <span>{t('Seu nome')}:</span>
            <input
              type="text"
              value={name}
              maxLength={maxNameLength}
              onChange={(event) => commitName(event.target.value)}
              aria-label={t('Seu nome')}
            />
          </div>

          <form className="chat-composer" onSubmit={submit}>
            <input
              type="text"
              value={text}
              maxLength={maxTextLength}
              onChange={(event) => setText(event.target.value)}
              placeholder={t('Escreva uma mensagem…')}
              aria-label={t('Escreva uma mensagem…')}
            />
            <button type="submit" disabled={onCooldown || !text.trim()} aria-label={t('Enviar')} title={onCooldown ? t('Aguarde {seconds}s para enviar outra mensagem', { seconds: cooldownRemaining }) : t('Enviar')}>
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-bubble"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? t('Fechar mural da comunidade') : t('Abrir mural da comunidade')}
      >
        <MessageCircle size={22} />
      </button>
    </div>
  )
}
