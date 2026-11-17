import { useEffect, useRef, useState } from 'react'
import { X, Search, Inbox, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

/* ---------- toast ---------- */
const toastSubs = new Set()
export const toast = (msg, tone = 'ok') => toastSubs.forEach((f) => f({ id: Math.random(), msg, tone }))
export function Toaster() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const f = (t) => {
      setItems((x) => [...x, t])
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 4200)
    }
    toastSubs.add(f)
    return () => toastSubs.delete(f)
  }, [])
  return (
    <div className="no-print fixed bottom-4 inset-x-4 md:inset-x-auto md:start-6 z-[120] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`rise pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-white shadow-pop md:min-w-[320px] md:max-w-md ${t.tone === 'ok' ? 'bg-navy-deep' : t.tone === 'warn' ? 'bg-warn-ink' : 'bg-bad-ink'}`}>
          {t.tone === 'ok' ? <CheckCircle2 size={20} className="text-gold shrink-0 mt-0.5" /> : <AlertTriangle size={20} className="shrink-0 mt-0.5" />}
          <span className="font-semibold text-sm leading-relaxed">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- basics ---------- */
const PALETTE = ['#12385B', '#8A6410', '#1F6F8B', '#6B4E9B', '#2E7D5B', '#A8483F', '#3F5F9A']
const TITLES = ['أ.', 'د.', 'الشيخ', 'أ', 'د', 'م.']
export function initials(name = '') {
  const w = name.split(' ').filter((x) => x && !TITLES.includes(x))
  return (w[0]?.[0] || '') + (w[1]?.[0] || '')
}
export function Avatar({ name, size = 40, className = '' }) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ring-2 ring-white shadow-sm ${className}`} style={{ width: size, height: size, background: PALETTE[h % PALETTE.length], fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  )
}
export const Badge = ({ tone = 'gray', children, className = '' }) => <span className={`badge badge-${tone} ${className}`}>{children}</span>

export const LESSON_STATUS = {
  upcoming: { label: 'قادمة', tone: 'info' },
  completed: { label: 'مكتملة', tone: 'ok' },
  cancelled: { label: 'ملغاة', tone: 'gray' },
  absent: { label: 'لم يحضر الطالب', tone: 'bad' },
  incomplete: { label: 'غير مكتملة', tone: 'warn' },
}
export const PAY_STATUS = { paid: { label: 'مدفوع', tone: 'ok' }, partial: { label: 'مدفوع جزئيًا', tone: 'warn' }, unpaid: { label: 'غير مدفوع', tone: 'bad' }, none: { label: 'لا مستحقات', tone: 'gray' } }
export const ATTENDANCE = { present: 'حاضر', late: 'متأخر', absent: 'غائب' }
export const LESSON_TYPE = { online: 'عن بُعد', inperson: 'حضوري' }
export const StatusBadge = ({ status }) => <Badge tone={LESSON_STATUS[status].tone}>{LESSON_STATUS[status].label}</Badge>
export const PayBadge = ({ status }) => <Badge tone={PAY_STATUS[status].tone}>{PAY_STATUS[status].label}</Badge>

export const CURRENCY = { EGP: 'ج.م', USD: 'دولار' }
export const money = (n, settings) => `${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${CURRENCY[settings?.currency] || 'ج.م'}`
export const num = (n, d = 1) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: d })

/* ---------- layout pieces ---------- */
export function PageHeader({ title, sub, actions, back }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 no-print-gap">
      <div>
        {back}
        <h1 className="text-2xl md:text-[1.9rem]">{title}</h1>
        {sub && <p className="text-slate mt-1">{sub}</p>}
        <div className="rule-gold mt-3" />
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  )
}
export function Card({ title, action, children, className = '', pad = true }) {
  return (
    <section className={`card ${pad ? 'card-pad' : ''} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="text-lg">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
export function Stat({ icon: Icon, label, value, sub, tone = 'navy' }) {
  const tones = { navy: 'bg-navy text-white', gold: 'bg-gold text-navy-deep', ok: 'bg-ok-ink text-white', warn: 'bg-warn-ink text-white', bad: 'bg-bad-ink text-white', mist: 'bg-mist text-navy' }
  return (
    <div className="card p-4 md:p-5 flex items-start gap-3.5 rise">
      {Icon && (
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={21} />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-[.82rem] font-semibold text-slate">{label}</div>
        <div className="text-[1.45rem] font-extrabold text-navy-deep leading-tight mt-0.5">{value}</div>
        {sub && <div className="text-xs text-slate mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}
export function Empty({ title = 'لا توجد بيانات', text, action, icon: Icon = Inbox }) {
  return (
    <div className="text-center py-10 px-4">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-mist text-navy mb-3">
        <Icon size={26} />
      </span>
      <div className="font-bold text-navy-deep">{title}</div>
      {text && <p className="text-slate text-sm mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto border-b border-hair no-print ${className}`}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`shrink-0 px-4 py-3 font-bold text-sm border-b-[3px] -mb-px transition-colors ${value === t.id ? 'border-gold text-navy-deep' : 'border-transparent text-slate hover:text-navy'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
export function SearchBox({ value, onChange, placeholder = 'بحث...' }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate pointer-events-none" />
      <input className="input ps-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  )
}
export function Select({ value, onChange, options, placeholder, label, className = '' }) {
  return (
    <select className={`select ${className}`} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label || placeholder}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
export function Field({ label, error, required, hint, children, className = '', id }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label} {required && <span className="text-bad-ink" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate mt-1">{hint}</p>}
      {error && (
        <p className="text-xs font-semibold text-bad-ink mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
export function Notice({ tone = 'info', children, className = '' }) {
  const t = { info: 'bg-mist text-navy border-[#c5d6e8]', warn: 'bg-[#fdf3df] text-warn-ink border-[#f0d9a8]', bad: 'bg-[#fbe9e8] text-bad-ink border-[#f0c4c2]', ok: 'bg-[#e6f5ee] text-ok-ink border-[#bfe3d1]' }
  return (
    <div className={`flex gap-2.5 items-start rounded-xl border px-4 py-3 text-sm font-semibold ${t[tone]} ${className}`}>
      {tone === 'info' ? <Info size={18} className="shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
      <div>{children}</div>
    </div>
  )
}

/* ---------- modal ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const f = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', f)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', f)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'md:max-w-md', md: 'md:max-w-2xl', lg: 'md:max-w-4xl' }[size]
  return (
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center md:p-6 bg-navy-deep/60 backdrop-blur-[2px] no-print" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`bg-white w-full ${w} max-h-[94vh] flex flex-col rounded-t-3xl md:rounded-2xl shadow-pop outline-none`} style={{ animation: 'pop .22s ease both' }}>
        <div className="flex items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-hair">
          <h2 className="text-lg">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 md:px-6 py-5 flex-1">{children}</div>
        {footer && <div className="px-5 md:px-6 py-4 border-t border-hair bg-cream/60 rounded-b-2xl flex flex-wrap gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  )
}
export function Confirm({ open, onClose, onConfirm, title, text, confirmLabel = 'تأكيد الحذف', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<>
      <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
    </>}>
      <div className="flex gap-3">
        <span className="h-11 w-11 shrink-0 rounded-full bg-[#fbe6e5] text-bad-ink inline-flex items-center justify-center"><AlertTriangle size={22} /></span>
        <p className="leading-relaxed">{text}</p>
      </div>
    </Modal>
  )
}

/* ---------- responsive table: table on md+, cards on mobile ---------- */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, empty }) {
  if (!rows.length) return <Empty title={empty?.title || 'لا توجد نتائج'} text={empty?.text || 'جرّب تعديل البحث أو عوامل التصفية.'} />
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} data-click={onRowClick ? '' : undefined} onClick={() => onRowClick?.(r)}>
                {columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {rows.map((r) => (
          <div key={rowKey(r)} onClick={() => onRowClick?.(r)} className="rounded-xl border border-hair p-3.5 bg-white">
            {columns.map((c, i) => (
              <div key={c.key} className={`flex justify-between items-center gap-3 ${i === 0 ? 'pb-2 mb-1.5 border-b border-hair font-bold' : 'py-1 text-sm'}`}>
                {i > 0 && c.label && <span className="text-slate shrink-0">{c.label}</span>}
                <div className={i === 0 ? 'w-full' : 'text-end min-w-0'}>{c.render ? c.render(r) : r[c.key]}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

export function ProgressBar({ value, tone = 'navy' }) {
  const c = { navy: 'bg-navy', ok: 'bg-ok', warn: 'bg-warn', gold: 'bg-gold' }[tone]
  return (
    <div className="h-2 rounded-full bg-mist overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${c}`} style={{ width: `${Math.min(100, value)}%`, transition: 'width .6s ease' }} />
    </div>
  )
}
export const scoreTone = (v) => (v >= 85 ? 'ok' : v >= 70 ? 'navy' : 'warn')

export function downloadCSV(name, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(c.csv ? c.csv(r) : r[c.key])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
