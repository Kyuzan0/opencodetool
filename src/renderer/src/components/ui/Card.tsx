interface CardProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function Card({
  title,
  description,
  children,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onToggle
}: CardProps): JSX.Element {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const isControlled = controlledCollapsed !== undefined
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed

  function handleToggle(): void {
    if (!collapsible) return
    if (isControlled && onToggle) {
      onToggle()
    } else {
      setInternalCollapsed(!internalCollapsed)
    }
  }

  return (
    <div className={`card ${className}`}>
      {title && (
        <div
          className={`flex items-center justify-between ${collapsible ? 'cursor-pointer select-none' : ''} ${isCollapsed ? '' : 'mb-3'}`}
          onClick={handleToggle}
        >
          <div>
            <h3 className="text-sm font-semibold text-themed">{title}</h3>
            {description && <p className="text-xs text-themed-muted">{description}</p>}
          </div>
          {collapsible && (
            <span className="text-themed-muted">
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>
      )}
      {!isCollapsed && children}
    </div>
  )
}
