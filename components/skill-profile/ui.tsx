import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-[#e6eaf0] bg-white p-5 shadow-[0_4px_16px_rgba(31,48,82,.025)]', className)}>{children}</div>
}

export function SectionHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        {eyebrow && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.16em] text-[#3959d8]">{eyebrow}</p>}
        <div className="flex items-center gap-2">
          <h3 className="text-[17px] font-semibold text-[#17213a]">{title}</h3>
        </div>
        {subtitle && <p className="mt-1 max-w-[600px] text-[12px] leading-5 text-[#8a94a6]">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-[#edf0f5]', className)}>
      <div className="h-full rounded-full bg-[#3959d8]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

const badgeStyles: Record<string, string> = {
  verified: 'bg-[#eaf6f1] text-[#2c9d78]',
  pending: 'bg-[#fff5df] text-[#aa7822]',
  rejected: 'bg-[#fdecec] text-[#d36b6b]',
  neutral: 'bg-[#f4f6fa] text-[#6e798d]',
}

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeStyles | 'verified' | 'pending' | 'rejected' | 'neutral'; children: ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', badgeStyles[tone])}>{children}</span>
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#dfe4ec] bg-[#fafbfd] py-10 text-center">
      <p className="text-sm font-medium text-[#6e798d]">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-[#9aa3b3]">{hint}</p>}
    </div>
  )
}

export const demandTone = (level: string) =>
  level === 'High' ? 'verified' : level === 'Moderate' || level === 'Low' ? 'pending' : level === 'Unavailable' ? 'neutral' : 'rejected'

export const proficiencyColor = (level: string) =>
  level === 'Expert' ? 'text-[#2c9d78]' : level === 'Advanced' ? 'text-[#3959d8]' : level === 'Intermediate' ? 'text-[#aa7822]' : 'text-[#d36b6b]'