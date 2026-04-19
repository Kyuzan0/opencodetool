interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps {
  label?: string
  description?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function SelectInput({
  label,
  description,
  options,
  value,
  onChange,
  placeholder,
  className = '',
  disabled
}: SelectInputProps): JSX.Element {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-themed-secondary tracking-tight">
          {label}
        </label>
      )}
      {description && <p className="text-xs text-themed-muted leading-relaxed">{description}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-field w-full"
      >
        {placeholder && (
          <option value="" className="text-themed-muted">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
