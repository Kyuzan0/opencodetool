interface ToggleSwitchProps {
  label?: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export default function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  className = '',
  disabled
}: ToggleSwitchProps): JSX.Element {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="space-y-0.5">
        {label && <span className="text-sm font-medium text-themed-secondary">{label}</span>}
        {description && <p className="text-xs text-themed-muted leading-relaxed">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-primary disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? 'bg-accent shadow-[0_0_8px_rgba(0,212,170,0.3)]' : 'toggle-track'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
