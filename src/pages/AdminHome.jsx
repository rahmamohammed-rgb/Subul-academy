import { useState } from 'react'
import { UserRound, GraduationCap, CalendarDays, Clock, Wallet, Check, CircleDollarSign, Plus, ClipboardCheck, Bell } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import { PageHeader, Card, Stat, Empty, money, num, Avatar, StatusBadge } from '../components/ui'
import { LessonCard, LessonDetail } from '../components/lesson'
import { LessonFormModal, TeacherFormModal, StudentFormModal } from '../components/forms'
import { totals, getStudent, getTeacher, getSubject, lessonSort, notificationsFor } from '../lib/calc'
import { weeklyActivity, monthlyFinance } from '../lib/stats'
import { fmtDate, fmtDateTime, todayISO, relativeDay } from '../lib/dates'
import { Link, go } from '../lib/router'
import { notifRoute } from './Notifications'

const tip = { fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12, border: '1px solid #e3eaf2' }

export default function AdminHome({ db, user }) {
  const [modal, setModal] = useState(null)
  const [open, setOpen] = useState(null)
  const t = totals(db)
  const today = todayISO()
  const todays = db.lessons.filter((l) => l.date === today && l.status !== 'cancelled')
  const upcoming = db.lessons.filter((l) => l.status === 'upcoming' && (l.date > today || l.date === today)).sort(lessonSort).slice(0, 5)
  const recent = db.lessons.filter((l) => l.status === 'completed').sort((a, b) => lessonSort(b, a)).slice(0, 5)
  const pays = [...db.payments].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 5)
  const notifs = notificationsFor(db, user.id).slice(0, 4)
  const week = weeklyActivity(db)
  const fin = monthlyFinance(db)
  const name = (p) => (p.type === 'student' ? getStudent(db, p.refId)?.name : getTeacher(db, p.refId)?.name)
  return (
    <div>
      <PageHeader title={`مرحبًا ${user.name.split(' ').slice(0, 2).join(' ')}`} sub="نظرة شاملة على نشاط الأكاديمية اليوم" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <Stat icon={UserRound} label="إجمالي المعلمين" value={db.teachers.length} />
        <Stat icon={GraduationCap} label="إجمالي الطلاب" value={db.students.length} />
        <Stat icon={CalendarDays} tone="gold" label="حصص اليوم" value={todays.length} sub={`${todays.filter((l) => l.status === 'completed').length} مكتملة`} />
        <Stat icon={Clock} label="الساعات المنفذة" value={`${num(t.studentHours)} س`} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat icon={Wallet} tone="navy" label="إجمالي المستحقات (رسوم الطلاب)" value={money(t.studentCharges, db.settings)} />
        <Stat icon={Check} tone="ok" label="المبالغ المدفوعة" value={money(t.studentPaid, db.settings)} />
        <Stat icon={CircleDollarSign} tone="bad" label="المبالغ المتبقية" value={money(t.studentBalance, db.settings)} />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-2">
          <span className="font-extrabold text-navy-deep me-2 self-center">إجراءات سريعة</span>
          <button className="btn btn-outline btn-sm" onClick={() => setModal('teacher')}><Plus size={15} /> إضافة معلم</button>
          <button className="btn btn-outline btn-sm" onClick={() => setModal('student')}><Plus size={15} /> إضافة طالب</button>
          <button className="btn btn-outline btn-sm" onClick={() => setModal('lesson')}><CalendarDays size={15} /> جدولة حصة</button>
          <button className="btn btn-primary btn-sm" onClick={() => go('/app/record')}><ClipboardCheck size={15} /> تسجيل حصة منفذة</button>
        </div>
      </Card>

      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Card title="نشاط الحصص هذا الأسبوع">
          <div dir="ltr" className="h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...week].reverse()} margin={{ left: -20, right: 4, top: 4 }}>
              <CartesianGrid stroke="#e3eaf2" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5a6a7e' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} orientation="right" tick={{ fontSize: 11, fill: '#5a6a7e' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tip} cursor={{ fill: '#eef3f8' }} />
              <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
              <Bar dataKey="completed" name="مكتملة" stackId="a" fill="#12385B" />
              <Bar dataKey="upcoming" name="قادمة" stackId="a" fill="#D8A642" />
              <Bar dataKey="other" name="ملغاة/غياب" stackId="a" fill="#c9d3df" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer></div>
        </Card>
        <Card title={`الملخص المالي الشهري (${db.settings.currency === 'EGP' ? 'جنيه مصري' : 'دولار'})`}>
          <div dir="ltr" className="h-64"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fin} margin={{ left: 0, right: 4, top: 4 }}>
              <CartesianGrid stroke="#e3eaf2" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5a6a7e' }} tickLine={false} axisLine={false} reversed />
              <YAxis orientation="right" tick={{ fontSize: 11, fill: '#5a6a7e' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tip} formatter={(v) => v.toLocaleString('en-US')} />
              <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
              <Area type="monotone" dataKey="charges" name="رسوم الطلاب" stroke="#12385B" fill="#12385B22" strokeWidth={2.5} />
              <Area type="monotone" dataKey="received" name="المقبوض" stroke="#23966A" fill="#23966A22" strokeWidth={2.5} />
              <Area type="monotone" dataKey="earnings" name="مستحقات المعلمين" stroke="#D8A642" fill="#D8A64222" strokeWidth={2.5} />
            </AreaChart></ResponsiveContainer></div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Card title="الحصص القادمة" action={<Link to="/app/schedule" className="text-sm font-bold text-navy">الجدول</Link>}>
          {upcoming.length ? <div className="flex flex-col gap-2.5">{upcoming.map((l) => <div key={l.id}><div className="text-xs font-bold text-gold-ink mb-1">{relativeDay(l.date)} - {fmtDate(l.date)}</div><LessonCard l={l} db={db} onClick={setOpen} /></div>)}</div> : <Empty title="لا توجد حصص قادمة" />}
        </Card>
        <Card title="آخر الحصص المكتملة" action={<Link to="/app/record" className="text-sm font-bold text-navy">السجل</Link>}>
          {recent.length ? <div className="flex flex-col gap-2.5">{recent.map((l) => <div key={l.id}><div className="text-xs font-bold text-slate mb-1">{fmtDate(l.date)}</div><LessonCard l={l} db={db} onClick={setOpen} /></div>)}</div> : <Empty title="لا توجد حصص مكتملة" />}
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="آخر المدفوعات" action={<Link to="/app/finance" className="text-sm font-bold text-navy">المالية</Link>}>
          <ul className="divide-y divide-hair">{pays.map((p) => <li key={p.id} className="py-2.5 flex items-center gap-3"><Avatar name={name(p) || '؟'} size={36} /><div className="flex-1 min-w-0"><div className="font-bold truncate">{name(p)}</div><div className="text-xs text-slate">{p.type === 'student' ? 'من طالب' : 'إلى معلم'} • {p.method} • {fmtDate(p.date)}</div></div><b className={`num ${p.type === 'student' ? 'text-ok-ink' : 'text-navy'}`}>{p.type === 'student' ? '+' : '-'}{money(p.amount, db.settings)}</b></li>)}</ul>
          {!pays.length && <Empty title="لا توجد مدفوعات" />}
        </Card>
        <Card title="أحدث الإشعارات" action={<Link to="/app/notifications" className="text-sm font-bold text-navy">الكل</Link>}>
          {notifs.length ? <ul className="divide-y divide-hair">{notifs.map((n) => <li key={n.id} className="py-2.5 flex gap-3"><span className={`mt-2 size-2 rounded-full shrink-0 ${n.readBy.includes(user.id) ? 'bg-hair' : 'bg-gold'}`} /><div><Link to={notifRoute(n, user) || '/app/notifications'} className="font-bold hover:underline">{n.title}</Link><div className="text-sm text-slate line-clamp-1">{n.body}</div><div className="text-xs text-slate mt-0.5">{fmtDateTime(n.at)}</div></div></li>)}</ul> : <Empty title="لا توجد إشعارات" icon={Bell} />}
        </Card>
      </div>
      {open && <LessonDetail l={open} db={db} onClose={() => setOpen(null)} />}
      <TeacherFormModal open={modal === 'teacher'} onClose={() => setModal(null)} db={db} onSaved={(id) => go(`/app/teachers/${id}`)} />
      <StudentFormModal open={modal === 'student'} onClose={() => setModal(null)} db={db} onSaved={(id) => go(`/app/students/${id}`)} />
      <LessonFormModal open={modal === 'lesson'} onClose={() => setModal(null)} db={db} user={user} />
    </div>
  )
}
