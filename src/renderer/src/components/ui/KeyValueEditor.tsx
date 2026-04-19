import { Plus, Trash2 } from 'lucide-react'

interface KeyValuePair {
  key: string
  value: string
}

interface KeyValueEditorProps {
  label?: string
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  valueType?: 'text' | 'password'
  className?: string
}

export default function KeyValueEditor({
  label,
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  valueType = 'text',
  className = ''
}: KeyValueEditorProps): JSX.Element {
  const addRow = () => onChange([...pairs, { key: '', value: '' }])
  const removeRow = (i: number) => onChange(pairs.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: 'key' | 'value', val: string) =>
    onChange(pairs.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)))

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-themed-secondary">{label}</label>}
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input-field flex-1"
            value={pair.key}
            onChange={(e) => updateRow(i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
          />
          <input
            className="input-field flex-1"
            type={valueType}
            value={pair.value}
            onChange={(e) => updateRow(i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
          />
          <button onClick={() => removeRow(i)} className="p-1 text-themed-muted hover:text-danger">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button onClick={addRow} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover">
        <Plus size={14} /> Add
      </button>
    </div>
  )
}
