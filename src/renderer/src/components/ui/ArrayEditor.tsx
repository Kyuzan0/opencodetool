import { Plus, Trash2, GripVertical } from 'lucide-react'

interface ArrayEditorProps {
  label?: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  className?: string
}

export default function ArrayEditor({
  label,
  items,
  onChange,
  placeholder = 'Enter value',
  className = ''
}: ArrayEditorProps): JSX.Element {
  const addItem = () => onChange([...items, ''])
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, val: string) => onChange(items.map((v, idx) => (idx === i ? val : v)))
  const moveItem = (from: number, to: number) => {
    const arr = [...items]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    onChange(arr)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-themed-secondary">{label}</label>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="cursor-grab text-themed-muted">
            <GripVertical size={14} />
          </span>
          <input
            className="input-field flex-1"
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
          />
          {i > 0 && (
            <button onClick={() => moveItem(i, i - 1)} className="p-1 text-themed-muted hover:text-themed-secondary text-xs">
              ↑
            </button>
          )}
          {i < items.length - 1 && (
            <button onClick={() => moveItem(i, i + 1)} className="p-1 text-themed-muted hover:text-themed-secondary text-xs">
              ↓
            </button>
          )}
          <button onClick={() => removeItem(i)} className="p-1 text-themed-muted hover:text-danger">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button onClick={addItem} className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover">
        <Plus size={14} /> Add
      </button>
    </div>
  )
}
