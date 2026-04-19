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
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none'
  const variants = {
    primary:
      'bg-gradient-to-b from-accent to-accent/90 text-gray-950 shadow-[0_1px_3px_rgba(0,212,170,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_4px_12px_rgba(0,212,170,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-px active:translate-y-0 focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-primary',
    secondary:
      'border border-border-default bg-transparent text-themed-secondary hover:text-themed hover:border-[var(--color-border-bright)] hover:bg-white/[0.03] focus:ring-2 focus:ring-accent/20 focus:ring-offset-2 focus:ring-offset-primary',
    danger:
      'bg-gradient-to-b from-danger to-danger/90 text-white shadow-[0_1px_3px_rgba(244,63,94,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_4px_12px_rgba(244,63,94,0.3)] hover:-translate-y-px active:translate-y-0 focus:ring-2 focus:ring-danger/40 focus:ring-offset-2 focus:ring-offset-primary'
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
