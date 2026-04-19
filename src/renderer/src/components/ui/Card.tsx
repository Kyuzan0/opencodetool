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
          className={`flex items-center justify-between ${collapsible ? 'cursor-pointer select-none group' : ''} ${isCollapsed ? '' : 'mb-4'}`}
          onClick={handleToggle}
        >
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-themed tracking-tight">{title}</h3>
            {description && (
              <p className="text-xs text-themed-muted leading-relaxed">{description}</p>
            )}
          </div>
          {collapsible && (
            <span className="text-themed-muted group-hover:text-themed-secondary transition-colors">
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>
      )}
      {!isCollapsed && children}
    </div>
  )
}
