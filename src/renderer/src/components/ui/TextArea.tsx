interface TextAreaProps {
  label?: string
  description?: string
  error?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  monospace?: boolean
  rows?: number
  disabled?: boolean
}

export default function TextArea({
  label,
  description,
  error,
  value,
  onChange,
  placeholder,
  className = '',
  monospace = false,
  rows = 6,
  disabled
}: TextAreaProps): JSX.Element {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`input-field w-full resize-y ${monospace ? 'font-mono text-xs' : ''} ${error ? 'border-danger' : ''}`}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
