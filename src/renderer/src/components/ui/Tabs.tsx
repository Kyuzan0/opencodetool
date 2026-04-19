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
    <div className={`flex overflow-x-auto border-b border-border-default gap-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-t-lg ${
            activeTab === tab.id
              ? 'text-accent bg-accent/[0.06]'
              : 'text-themed-muted hover:text-themed-secondary hover:bg-white/[0.02]'
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
