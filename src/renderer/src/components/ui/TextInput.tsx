import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface TextInputProps {
  label?: string
  description?: string
  error?: string
  type?: 'text' | 'password' | 'number' | 'url'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function TextInput({
  label,
  description,
  error,
  type = 'text',
  value,
  onChange,
  placeholder,
  className = '',
  disabled
}: TextInputProps): JSX.Element {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-themed-secondary tracking-tight">
          {label}
        </label>
      )}
      {description && <p className="text-xs text-themed-muted leading-relaxed">{description}</p>}
      <div className="relative group">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field w-full ${type === 'password' ? 'pr-10' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-themed-muted hover:text-themed-secondary transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  )
}
