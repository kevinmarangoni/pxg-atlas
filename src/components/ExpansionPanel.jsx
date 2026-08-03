import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function ExpansionPanel({ icon, title, badge, headerExtra, defaultOpen = false, open: controlledOpen, onToggle, className = '', children }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const toggle = () => {
    if (isControlled) onToggle?.(!open)
    else setUncontrolledOpen((value) => !value)
  }

  return (
    <div className={`expansion-panel ${open ? 'open' : ''} ${className}`}>
      <button type="button" className="expansion-panel-toggle" onClick={toggle} aria-expanded={open}>
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
