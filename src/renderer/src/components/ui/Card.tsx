interface CardProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function Card({
  title,
  description,
  children,
  className = '',
  collapsible = false,
  defaultCollapsed = false
}: CardProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div className={`card ${className}`}>
      {title && (
        <div
          className={`flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''} ${collapsed ? '' : 'mb-3'}`}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
          {collapsible && (
            <span className="text-gray-500">
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </span>
          )}
        </div>
      )}
      {!collapsed && children}
    </div>
  )
}
