import type { InputHTMLAttributes, ReactNode } from "react"

export const Card = ({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}): JSX.Element => (
  <div
    className={`rounded-2xl bg-white shadow-sm border border-dough-300 p-4 ${className}`}
  >
    {children}
  </div>
)

export const Button = ({
  children,
  variant = "primary",
  disabled = false,
  type = "button",
  onClick,
  className = "",
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "danger" | "ghost"
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  onClick?: () => void
  className?: string
}): JSX.Element => {
  const base =
    "inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
  const variantClass = {
    primary: "bg-tomato-500 text-white hover:bg-tomato-700",
    secondary: "bg-dough-100 text-stone-800 hover:bg-dough-300",
    danger: "bg-red-100 text-red-800 hover:bg-red-200",
    ghost: "bg-transparent text-stone-700 hover:bg-stone-100",
  }[variant]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variantClass} ${className}`}
    >
      {children}
    </button>
  )
}

type InputBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className">

export const FormField = ({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}): JSX.Element => (
  <label className="flex flex-col gap-1 text-sm">
    <span className="font-medium text-stone-700">{label}</span>
    {children}
    {error !== undefined && error !== "" ? (
      <span className="text-xs text-red-700">{error}</span>
    ) : hint !== undefined && hint !== "" ? (
      <span className="text-xs text-stone-500">{hint}</span>
    ) : null}
  </label>
)

export const TextInput = (props: InputBaseProps): JSX.Element => (
  <input
    {...props}
    className="rounded-lg border border-dough-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-tomato-500/40 focus:border-tomato-500 min-h-[44px]"
  />
)

export const NumberInput = ({
  value,
  onChange,
  step = "any",
  min,
  max,
  placeholder,
  ...rest
}: Omit<InputBaseProps, "value" | "onChange" | "type"> & {
  value: number | ""
  onChange: (n: number | "") => void
  step?: number | string
  min?: number
  max?: number
  placeholder?: string
}): JSX.Element => (
  <input
    {...rest}
    type="number"
    inputMode="decimal"
    value={value}
    step={step}
    min={min}
    max={max}
    placeholder={placeholder}
    onChange={(e) => {
      const v = e.target.value
      if (v === "") {
        onChange("")
        return
      }
      const n = Number(v)
      if (!Number.isFinite(n)) return
      onChange(n)
    }}
    className="rounded-lg border border-dough-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-tomato-500/40 focus:border-tomato-500 min-h-[44px]"
  />
)

export const Select = <T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
}): JSX.Element => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as T)}
    className="rounded-lg border border-dough-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-tomato-500/40 focus:border-tomato-500 min-h-[44px]"
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
)

export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}): JSX.Element => (
  <header className="flex items-start justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold text-tomato-700">{title}</h1>
      {subtitle !== undefined ? (
        <p className="text-stone-600 text-sm mt-0.5">{subtitle}</p>
      ) : null}
    </div>
    {action}
  </header>
)
