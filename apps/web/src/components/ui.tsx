import { type ReactNode, type ButtonHTMLAttributes, useEffect } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs))
}

// Card
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('bg-black-card border border-black-border rounded-xl', className)}>
      {children}
    </div>
  )
}

// Button
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wide rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none'
  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-xs',
    lg: 'px-8 py-4 text-sm',
  }
  const variants = {
    primary: 'bg-gold hover:bg-gold-hover text-black shadow-lg shadow-gold/10',
    secondary: 'bg-black-bg hover:bg-black-border text-white border border-black-border',
    danger: 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50',
    ghost: 'hover:bg-black-border text-slate-400 hover:text-white',
  }

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

// Input
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</label>}
      <input
        className={cn(
          'w-full bg-black-bg border border-black-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold/50 transition-colors',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// Alert
export function Alert({
  type = 'info',
  children,
}: {
  type?: 'info' | 'success' | 'error' | 'warning'
  children: ReactNode
}) {
  const styles = {
    info: 'bg-blue-900/20 border-blue-800 text-blue-300',
    success: 'bg-emerald-900/20 border-emerald-800 text-emerald-300',
    error: 'bg-red-900/20 border-red-800 text-red-300',
    warning: 'bg-amber-900/20 border-amber-800 text-amber-300',
  }
  return (
    <div className={cn('border rounded-xl px-4 py-3 text-sm', styles[type])}>
      {children}
    </div>
  )
}

// Badge
export function Badge({
  children,
  variant = 'default',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold'
}) {
  const variants = {
    default: 'bg-black-border text-slate-300',
    success: 'bg-emerald-900/30 text-emerald-400',
    warning: 'bg-amber-900/30 text-amber-400',
    danger: 'bg-red-900/30 text-red-400',
    gold: 'bg-gold/10 text-gold',
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide', variants[variant])}>
      {children}
    </span>
  )
}

// Modal
export function Modal({
  title,
  onClose,
  children,
  className
}: {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className={cn("bg-black-card border border-black-border rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-black-border shrink-0">
          <h2 className="font-bold text-lg text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  )
}

// Loading spinner
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={cn('border-2 border-gold border-t-transparent rounded-full animate-spin', s[size])} />
  )
}

// Page header
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
