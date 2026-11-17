import { useState } from 'react'
import { Bell, CalendarClock, CheckCheck, Wallet, FileText, BookOpen, UserX, MessageSquare, CircleCheck } from 'lucide-react'
import { PageHeader, Card, Empty, Badge, Select, toast } from '../components/ui'
import { notificationsFor } from '../lib/calc'
import { fmtDateTime } from '../lib/dates'
import { go } from '../lib/router'
import { run } from '../components/forms'

const KIND = { schedule: ['جدولة', CalendarClock, 'navy'], reminder: ['تذكير', CalendarClock, 'gold'], upcoming: ['حصة قادمة', CalendarClock, 'gold'], completed: ['حصة مكتملة', CircleCheck, 'ok'], absent: ['غياب', UserX, 'bad'], payment: ['مدفوعات', Wallet, 'ok'], report: ['تقرير', FileText, 'navy'], homework: ['واجب', BookOpen, 'warn'], message: ['رسالة', MessageSquare, 'gray'] }

export function notifRoute(n, user) {
  const l = n.link
  if (!l) return null
  if (l.type === 'lesson') return user.role === 'parent' ? '/app/schedule' : `/app/schedule?lesson=${l.id}`
  if (l.type === 'student') return user.role === 'admin' || user.role === 'teacher' ? `/app/students/${l.id}` : user.role === 'student' ? '/app/homework' : '/app/progress'
  if (l.type === 'payment') return user.role === 'admin' ? '/app/finance' : user.role === 'parent' ? '/app/payments' : null
  if (l.type === 'settings') return user.role === 'admin' ? '/app/settings' : null
  return null
}

export default function Notifications({ db, user }) {
  const [status, setStatus] = useState('')
  const [kind, setKind] = useState('')
  const all = notificationsFor(db, user.id)
  const rows = all.filter((n) => (!status || (status === 'unread') === !n.readBy.includes(user.id)) && (!kind || n.kind === kind))
  const unread = all.filter((n) => !n.readBy.includes(user.id)).length
  const open = (n) => {
    run('markRead', user.id, n.id)
    const r = notifRoute(n, user)
    if (r) go(r)
  }
  return (
    <div>
      <PageHeader title="الإشعارات" sub={unread ? `لديك ${unread} إشعارات غير مقروءة` : 'لا توجد إشعارات غير مقروءة'} actions={<button className="btn btn-outline" disabled={!unread} onClick={() => { run('markAllRead', user.id); toast('تم تحديد الكل كمقروء') }}><CheckCheck size={16} /> تحديد الكل كمقروء</button>} />
      <div className="grid sm:grid-cols-2 gap-3 max-w-xl mb-5">
        <Select value={status} onChange={setStatus} placeholder="الكل" options={[{ value: 'unread', label: 'غير مقروءة' }, { value: 'read', label: 'مقروءة' }]} />
        <Select value={kind} onChange={setKind} placeholder="كل الأنواع" options={Object.entries(KIND).map(([v, k]) => ({ value: v, label: k[0] }))} />
      </div>
      <Card pad={false}>
        {rows.length ? (
          <ul className="divide-y divide-hair">
            {rows.map((n) => {
              const [label, Icon, tone] = KIND[n.kind] || KIND.message
              const isUnread = !n.readBy.includes(user.id)
              return (
                <li key={n.id} className={`flex gap-4 p-4 md:p-5 ${isUnread ? 'bg-[#fdf8ec]' : ''}`}>
                  <span className="size-11 shrink-0 rounded-xl bg-mist text-navy inline-flex items-center justify-center"><Icon size={21} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-base">{n.title}</h3><Badge tone={tone}>{label}</Badge>{isUnread && <Badge tone="gold">جديد</Badge>}</div>
                    <p className="text-slate text-sm mt-1 leading-relaxed">{n.body}</p>
                    <div className="text-xs text-slate mt-1.5">{fmtDateTime(n.at)}</div>
                    <div className="flex gap-3 mt-2">
                      {notifRoute(n, user) && <button className="text-sm font-bold text-navy underline underline-offset-4" onClick={() => open(n)}>فتح</button>}
                      {isUnread && <button className="text-sm font-bold text-slate hover:text-navy" onClick={() => run('markRead', user.id, n.id)}>تحديد كمقروء</button>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <div className="p-6"><Empty icon={Bell} title="لا توجد إشعارات" text="ستظهر هنا التنبيهات الجديدة عند حدوثها." /></div>}
      </Card>
    </div>
  )
}
