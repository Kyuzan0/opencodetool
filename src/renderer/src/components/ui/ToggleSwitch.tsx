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
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        {label && <span className="text-sm font-medium text-gray-300">{label}</span>}
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 ${
          checked ? 'bg-accent' : 'bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
