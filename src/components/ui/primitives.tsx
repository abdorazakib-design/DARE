import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'

// ---------- Button ----------

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-neon-500 to-plasma-500 text-white font-semibold shadow-[0_0_20px_rgb(34_211_238/0.25)] hover:shadow-[0_0_28px_rgb(34_211_238/0.4)] hover:brightness-110',
  ghost: 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
  outline: 'border border-white/12 text-slate-200 hover:border-neon-400/50 hover:text-white hover:bg-white/[0.04]',
  danger: 'border border-red-400/25 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400/40',
  success: 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/40',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center transition-all duration-200 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-400/70',
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) && 'pointer-events-none opacity-50',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ---------- Fields ----------

interface FieldWrapProps {
  label?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  children: ReactNode
}

export function FieldWrap({ label, error, required, className, children }: FieldWrapProps) {
  return (
    <div className={className}>
      {label ? (
        <label className="field-label">
          {label}
          {required && <span className="ml-0.5 text-neon-400">*</span>}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  )
}

export function TextInput({
  label,
  error,
  required,
  className,
  wrapClassName,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; error?: string | null; wrapClassName?: string }) {
  return (
    <FieldWrap label={label} error={error} required={required} className={wrapClassName}>
      <input className={cn('field', error && 'border-red-400/50', className)} {...rest} />
    </FieldWrap>
  )
}

export function TextArea({
  label,
  error,
  required,
  wrapClassName,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: ReactNode; error?: string | null; wrapClassName?: string }) {
  return (
    <FieldWrap label={label} error={error} required={required} className={wrapClassName}>
      <textarea className={cn('field min-h-20 resize-y', className)} {...rest} />
    </FieldWrap>
  )
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: ReactNode
  options: SelectOption[]
  placeholder?: string
  wrapClassName?: string
  error?: string | null
}

export function Select({ label, options, placeholder, wrapClassName, error, required, className, ...rest }: SelectProps) {
  const { t } = useI18n()
  return (
    <FieldWrap label={label} error={error} required={required} className={wrapClassName}>
      <select className={cn('field cursor-pointer appearance-none', className)} {...rest}>
        {/* Always present: the field starts empty and invites a selection. */}
        <option value="">{placeholder ?? t.common.choose}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-abyss-800 text-slate-100">
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  )
}

// ---------- Badges ----------

interface BadgeProps {
  color: string
  children: ReactNode
  className?: string
}

export function Badge({ color, children, className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', className)}
      style={{ backgroundColor: `${color}1a`, borderColor: `${color}59`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  )
}

// ---------- Feedback primitives ----------

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-neon-400', className)} />
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer-bar rounded-lg', className)} />
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-500">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-slate-500">{hint}</p> : null}
      {action}
    </div>
  )
}

// ---------- Layout helpers ----------

interface CardProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  right?: ReactNode
  subtitle?: ReactNode
  style?: CSSProperties
}

export function Card({ children, className, title, subtitle, right, style }: CardProps) {
  return (
    <section className={cn('glass glass-hover p-5', className)} style={style}>
      {title || right ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="card-title">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {right}
        </header>
      ) : null}
      {children}
    </section>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-[28px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
