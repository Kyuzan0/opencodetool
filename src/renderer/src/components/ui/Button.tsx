import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps): JSX.Element {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  const variants = {
    primary:
      'bg-gradient-to-b from-accent to-accent/90 text-gray-950 shadow-[0_2px_4px_rgba(0,212,170,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_16px_rgba(0,212,170,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-y-0 focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]',
    secondary:
      'border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-themed-secondary shadow-sm hover:text-themed hover:border-[var(--color-border-bright)] hover:bg-[var(--color-border-subtle)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]',
    danger:
      'bg-gradient-to-b from-danger to-danger/90 text-white shadow-[0_2px_4px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_16px_rgba(244,63,94,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 active:translate-y-0 focus:ring-2 focus:ring-danger/40 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)]'
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}
