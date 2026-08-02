import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function ExpansionPanel({ icon, title, badge, headerExtra, defaultOpen = false, className = '', children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`expansion-panel ${open ? 'open' : ''} ${className}`}>
      <button type="button" className="expansion-panel-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {icon && <span className="expansion-panel-icon">{icon}</span>}
        <span className="expansion-panel-title">{title}</span>
        {badge != null && <b className="expansion-panel-badge">{badge}</b>}
        <ChevronDown size={16} className="expansion-panel-chevron" />
      </button>
      {headerExtra && <div className="expansion-panel-extra">{headerExtra}</div>}
      {open && <div className="expansion-panel-body">{children}</div>}
    </div>
  )
}
