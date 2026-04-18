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
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field w-full ${type === 'password' ? 'pr-10' : ''} ${error ? 'border-danger' : ''}`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
