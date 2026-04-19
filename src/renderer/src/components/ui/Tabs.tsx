interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export default function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps): JSX.Element {
  return (
    <div className={`flex overflow-x-auto border-b border-border-default ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'border-b-2 border-accent text-accent'
              : 'text-themed-muted hover:text-themed-secondary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
