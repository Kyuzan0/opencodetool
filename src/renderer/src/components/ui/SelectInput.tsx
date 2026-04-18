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
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="input-field w-full"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
