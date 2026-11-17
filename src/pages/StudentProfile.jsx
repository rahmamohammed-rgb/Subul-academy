import { useState } from 'react'
import { ArrowRight, Pencil, Trash2, Plus, Phone, Mail, CalendarClock, Clock, Wallet, Star, Check } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { PageHeader, Card, Tabs, Avatar, Badge, Stat, Empty, DataTable, StatusBadge, PayBadge, ProgressBar, scoreTone, money, num, ATTENDANCE, LESSON_TYPE, Confirm, toast } from '../components/ui'
import { LessonCard, LessonDetail } from '../components/lesson'
import { StudentFormModal, PaymentModal, HomeworkModal, ReportModal, AttendanceModal, run } from '../components/forms'
import { accounts, attendanceStats, subjectScores, overallAvg, getTeacher, getParent, getSubject, studentTeachers, lessonSort, lessonMinutes } from '../lib/calc'
import { fmtDate, fmtDateShort, fmtTime, todayISO, hoursLabel, relativeDay, DAY_NAMES } from '../lib/dates'
import { go, Link } from '../lib/router'

const ALL = [
  { id: 'overview', label: 'نظرة عامة' }, { id: 'schedule', label: 'الجدول الدراسي' }, { id: 'attendance', label: 'الحصص والحضور' },
  { id: 'level', label: 'المستوى الدراسي' }, { id: 'homework', label: 'الواجبات' }, { id: 'reports', label: 'التقارير' }, { id: 'finance', label: 'المستحقات والمدفوعات' },
]
const HW = { pending: ['بانتظار التسليم', 'warn'], submitted: ['تم التسليم', 'navy'], reviewed: ['تمت المراجعة', 'ok'] }

export default function StudentProfile({ db, user, id, backTo, tabs, embedded }) {
  const s = db.students.find((x) => x.id === id)
  const visible = ALL.filter((t) => (tabs ? tabs.includes(t.id) : t.id !== 'finance' || ['admin', 'parent'].includes(user.role)))
  const [tab, setTab] = useState(visible[0].id)
  const [edit, setEdit] = useState(false)
  const [del, setDel] = useState(false)
  const [pay, setPay] = useState(false)
  const [hw, setHw] = useState(false)
  const [rep, setRep] = useState(false)
  const [att, setAtt] = useState(false)
  const [open, setOpen] = useState(null)
  if (!s) return <Empty title="الطالب غير موجود" action={<Link to="/app/students" className="btn btn-primary">العودة</Link>} />
  const today = todayISO()
  const acc = accounts(db).students[s.id]
  const myT = user.role === 'teacher' ? user.refId : null
  const lessons = db.lessons.filter((l) => l.studentId === s.id && (!myT || l.teacherId === myT)).sort(lessonSort)
  const up = lessons.filter((l) => l.status === 'upcoming' && l.date >= today)
  const past = lessons.filter((l) => l.status !== 'upcoming').reverse()
  const stats = attendanceStats(lessons)
  const scores = subjectScores(db, s.id)
  const avg = overallAvg(scores)
  const homework = db.homework.filter((h) => h.studentId === s.id && (!myT || h.teacherId === myT)).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const reports = db.reports.filter((r) => r.studentId === s.id && (!myT || r.teacherId === myT)).sort((a, b) => b.date.localeCompare(a.date))
  const parent = getParent(db, s.parentId)
  const payments = db.payments.filter((p) => p.type === 'student' && p.refId === s.id).sort((a, b) => b.date.localeCompare(a.date))
  const canTeach = ['admin', 'teacher'].includes(user.role)
  const isAdmin = user.role === 'admin'
  const sName = (x) => getSubject(db, x)?.name
  const myAssignments = s.assignments.filter((a) => !myT || a.teacherId === myT)

  const trend = (() => {
    const all = db.assessments.filter((a) => a.studentId === s.id).sort((a, b) => a.date.localeCompare(b.date))
    const byDate = {}
    all.forEach((a) => { (byDate[a.date] ||= []).push((a.score / a.max) * 100) })
    return Object.entries(byDate).map(([d, v]) => ({ d: fmtDateShort(d), v: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }))
  })()

  return (
    <div>
      {!embedded && (
        <PageHeader
          back={backTo && <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-bold text-navy mb-2"><ArrowRight size={16} /> العودة للقائمة</Link>}
          title={s.name} sub={`${s.id} • ${s.grade}`}
          actions={<>
            {canTeach && <button className="btn btn-outline" onClick={() => setHw(true)}><Plus size={16} /> إضافة واجب</button>}
            {canTeach && <button className="btn btn-outline" onClick={() => setRep(true)}><Plus size={16} /> إضافة تقرير</button>}
            {isAdmin && <button className="btn btn-outline" onClick={() => setEdit(true)}><Pencil size={16} /> تعديل</button>}
            {isAdmin && <button className="btn btn-danger" onClick={() => setDel(true)}><Trash2 size={16} /> حذف</button>}
          </>}
        />
      )}
      <Tabs tabs={visible} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'overview' && (
        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 flex flex-col gap-6">
            <Card>
              <div className="flex items-center gap-4 mb-4"><Avatar name={s.name} size={72} /><div><div className="text-xl font-extrabold text-navy-deep">{s.name}</div><div className="text-slate text-sm">{s.grade}</div><Badge tone={s.status === 'active' ? 'ok' : 'gray'} className="mt-1">{s.status === 'active' ? 'نشط' : 'متوقف'}</Badge></div></div>
              <dl className="text-sm divide-y divide-hair">
                <div className="flex justify-between py-2"><dt className="text-slate">رقم الطالب</dt><dd className="font-bold num">{s.id}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-slate">تاريخ الالتحاق</dt><dd className="font-bold">{fmtDate(s.joined)}</dd></div>
                {parent && <div className="flex justify-between py-2"><dt className="text-slate">ولي الأمر</dt><dd className="font-bold">{parent.name}</dd></div>}
                {parent && user.role !== 'student' && <div className="flex justify-between py-2"><dt className="text-slate">هاتف ولي الأمر</dt><dd className="font-bold" dir="ltr">{parent.phone}</dd></div>}
              </dl>
            </Card>
            <Card title="المواد والمعلمون">
              <ul className="flex flex-col gap-3">
                {myAssignments.map((a) => { const t = getTeacher(db, a.teacherId); return (
                  <li key={a.subjectId} className="flex items-center gap-3"><span className="h-9 w-1.5 rounded" style={{ background: getSubject(db, a.subjectId)?.color }} /><div className="flex-1"><div className="font-bold">{sName(a.subjectId)}</div><div className="text-xs text-slate">{t?.name}</div></div></li>
                ) })}
              </ul>
            </Card>
          </div>
          <div className="xl:col-span-2 flex flex-col gap-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <Stat icon={Check} tone="ok" label="نسبة الحضور" value={`${stats.rate}%`} sub={`${stats.present} من ${stats.total} حصة`} />
              <Stat icon={Star} tone="gold" label="المعدل الدراسي" value={scores.length ? `${avg}%` : '-'} sub={`${db.assessments.filter((a) => a.studentId === s.id).length} تقييم`} />
              <Stat icon={Clock} tone="navy" label="الساعات المنفذة" value={`${num(acc.hours)} س`} sub="حصص مكتملة" />
            </div>
            <Card title="الحصص القادمة" action={<button className="text-sm font-bold text-navy" onClick={() => setTab('schedule')}>عرض الكل</button>}>
              {up.length ? <div className="grid sm:grid-cols-2 gap-3">{up.slice(0, 4).map((l) => <div key={l.id}><div className="text-xs font-bold text-gold-ink mb-1">{relativeDay(l.date)} - {fmtDate(l.date)}</div><LessonCard l={l} db={db} showStudent={false} onClick={setOpen} /></div>)}</div> : <Empty title="لا توجد حصص قادمة" />}
            </Card>
            {scores.length > 0 && <Card title="تطور المستوى الدراسي"><TrendChart data={trend} /></Card>}
            {user.role !== 'teacher' && <Card title="الموقف المالي"><div className="grid grid-cols-3 gap-3 text-center"><div><div className="text-xs text-slate">إجمالي الرسوم</div><div className="font-extrabold num">{money(acc.charges, db.settings)}</div></div><div><div className="text-xs text-slate">المدفوع</div><div className="font-extrabold text-ok-ink num">{money(acc.paid, db.settings)}</div></div><div><div className="text-xs text-slate">المتبقي</div><div className="font-extrabold text-bad-ink num">{money(acc.balance, db.settings)}</div></div></div></Card>}
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <Card title="الجدول الأسبوعي والحصص القادمة">
          <div className="mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAssignments.map((a) => { const sample = lessons.find((l) => l.subjectId === a.subjectId && l.teacherId === a.teacherId); return (
              <div key={a.subjectId} className="rounded-xl bg-mist p-3 text-sm"><b>{sName(a.subjectId)}</b><div className="text-slate">{getTeacher(db, a.teacherId)?.name}</div>{sample && <div className="text-navy font-semibold mt-1">كل {DAY_NAMES[new Date(sample.date + 'T12:00').getDay()]} • <span className="num">{fmtTime(sample.start)}</span></div>}</div>
            ) })}
          </div>
          {up.length ? <div className="grid md:grid-cols-2 gap-3">{up.map((l) => <div key={l.id}><div className="text-xs font-bold text-gold-ink mb-1">{relativeDay(l.date)} - {fmtDate(l.date)}</div><LessonCard l={l} db={db} showStudent={false} onClick={setOpen} /></div>)}</div> : <Empty title="لا توجد حصص قادمة" icon={CalendarClock} />}
        </Card>
      )}

      {tab === 'attendance' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="حصص مسجلة" value={stats.total} /><Stat tone="ok" label="حضور" value={stats.present} /><Stat tone="bad" label="غياب" value={stats.absent} /><Stat tone="warn" label="تأخر" value={stats.late} />
          </div>
          <Card title="سجل الحصص" action={canTeach && <button className="btn btn-outline btn-sm" onClick={() => setAtt(true)}>تسجيل حضور</button>}>
            <div className="p-3 md:p-4">
              <DataTable rows={past} onRowClick={setOpen} columns={[
                { key: 'date', label: 'التاريخ', render: (l) => fmtDate(l.date), csv: (l) => l.date },
                { key: 'sub', label: 'المادة', render: (l) => sName(l.subjectId) },
                { key: 't', label: 'المعلم', render: (l) => getTeacher(db, l.teacherId)?.name },
                { key: 'd', label: 'المدة', render: (l) => hoursLabel(l.actualMinutes ?? lessonMinutes(l)) },
                { key: 'a', label: 'الحضور', render: (l) => (l.attendance ? ATTENDANCE[l.attendance] : '-') },
                { key: 's', label: 'الحالة', render: (l) => <StatusBadge status={l.status} /> },
              ]} empty={{ title: 'لا توجد حصص مسجلة بعد' }} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'level' && (
        <div className="flex flex-col gap-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Card title="المعدل العام" className="lg:col-span-1"><div className="text-5xl font-extrabold text-navy-deep num">{scores.length ? `${avg}%` : '-'}</div><p className="text-slate text-sm mt-2">متوسط {db.assessments.filter((a) => a.studentId === s.id).length} تقييمًا في {scores.length} مواد</p></Card>
            <Card title="تطور الدرجات" className="lg:col-span-2">{trend.length ? <TrendChart data={trend} /> : <Empty title="لا توجد تقييمات" />}</Card>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {scores.map((r) => (
              <Card key={r.subjectId}>
                <div className="flex items-center justify-between mb-2"><div className="font-extrabold text-navy-deep">{sName(r.subjectId)}</div><Badge tone={scoreTone(r.avg)}>{r.avg}%</Badge></div>
                <ProgressBar value={r.avg} tone={scoreTone(r.avg)} />
                <div className="text-xs text-slate mt-2">{r.trend >= 0 ? `تحسّن بمقدار ${r.trend} نقطة` : `انخفاض ${Math.abs(r.trend)} نقطة`} منذ أول تقييم</div>
                <ul className="mt-3 text-sm divide-y divide-hair">{r.list.slice(-4).reverse().map((a) => <li key={a.id} className="flex justify-between py-1.5"><span>{a.title} <span className="text-xs text-slate">({fmtDateShort(a.date)})</span></span><b className="num">{a.score}/{a.max}</b></li>)}</ul>
              </Card>
            ))}
            {!scores.length && <Empty title="لا توجد تقييمات بعد" />}
          </div>
        </div>
      )}

      {tab === 'homework' && (
        <Card title="الواجبات" action={canTeach && <button className="btn btn-outline btn-sm" onClick={() => setHw(true)}><Plus size={15} /> إضافة واجب</button>}>
          {homework.length ? (
            <ul className="divide-y divide-hair">
              {homework.map((h) => (
                <li key={h.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
                  <div><div className="font-bold">{h.title}</div><div className="text-xs text-slate">{sName(h.subjectId)} • {getTeacher(db, h.teacherId)?.name} • التسليم {fmtDate(h.dueDate)}{h.status === 'pending' && h.dueDate < today && <span className="text-bad-ink font-bold"> (متأخر)</span>}</div></div>
                  <div className="flex items-center gap-2">
                    <Badge tone={HW[h.status][1]}>{HW[h.status][0]}</Badge>
                    {user.role === 'student' && h.status === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => { run('setHomeworkStatus', h.id, 'submitted'); toast('تم تسليم الواجب') }}>تسليم</button>}
                    {canTeach && h.status === 'submitted' && <button className="btn btn-outline btn-sm" onClick={() => { run('setHomeworkStatus', h.id, 'reviewed'); toast('تمت المراجعة') }}>تمت المراجعة</button>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty title="لا توجد واجبات" />}
        </Card>
      )}

      {tab === 'reports' && (
        <Card title="تقارير المعلمين" action={canTeach && <button className="btn btn-outline btn-sm" onClick={() => setRep(true)}><Plus size={15} /> إضافة تقرير</button>}>
          {reports.length ? (
            <ul className="flex flex-col gap-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl bg-mist p-4"><div className="flex flex-wrap items-center justify-between gap-2 mb-1.5"><div className="font-bold text-navy-deep">{sName(r.subjectId)} <span className="text-slate font-normal text-sm">• {getTeacher(db, r.teacherId)?.name}</span></div><div className="flex items-center gap-2 text-xs text-slate"><span className="text-gold" aria-label={`التقييم ${r.rating} من 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>{fmtDate(r.date)}</div></div><p className="leading-relaxed text-sm">{r.text}</p></li>
              ))}
            </ul>
          ) : <Empty title="لا توجد تقارير" />}
        </Card>
      )}

      {tab === 'finance' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Clock} label="ساعات محتسبة" value={`${num(acc.hours)} س`} sub={`${money(acc.rate, db.settings)} / ساعة`} />
            <Stat icon={Wallet} label="إجمالي الرسوم" value={money(acc.charges, db.settings)} />
            <Stat tone="ok" icon={Check} label="المدفوع" value={money(acc.paid, db.settings)} />
            <Stat tone="bad" icon={Wallet} label="المتبقي" value={money(acc.balance, db.settings)} sub={<PayBadge status={acc.status} />} />
          </div>
          <Card title="سجل المدفوعات" action={isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setPay(true)}><Plus size={15} /> تسجيل دفعة</button>}>
            {payments.length ? <DataTable rows={payments} columns={[{ key: 'date', label: 'التاريخ', render: (p) => fmtDate(p.date) }, { key: 'amount', label: 'المبلغ', render: (p) => <b className="num">{money(p.amount, db.settings)}</b> }, { key: 'method', label: 'الطريقة' }, { key: 'note', label: 'ملاحظة', render: (p) => p.note || '-' }]} /> : <Empty title="لا توجد مدفوعات" />}
          </Card>
          <Card title="الحصص المحتسبة"><p className="text-sm text-slate">تُحتسب الحصص المكتملة فقط وفق قواعد الفوترة الحالية ({db.settings.billing === 'actual' ? 'المدة الفعلية' : 'المدة المجدولة'}). الحصص المجدولة أو الملغاة لا تُحتسب.</p></Card>
        </div>
      )}

      {open && <LessonDetail l={open} db={db} onClose={() => setOpen(null)} />}
      <StudentFormModal open={edit} onClose={() => setEdit(false)} db={db} student={s} />
      <Confirm open={del} onClose={() => setDel(false)} title="حذف الطالب" text={`سيتم حذف ${s.name} وجميع حصصه وواجباته وتقاريره ومدفوعاته نهائيًا. هل أنت متأكد؟`} onConfirm={() => { const r = run('deleteStudent', s.id); if (r.ok) { toast('تم حذف الطالب'); go('/app/students') } }} />
      <PaymentModal open={pay} onClose={() => setPay(false)} db={db} type="student" refId={s.id} />
      <HomeworkModal open={hw} onClose={() => setHw(false)} db={db} user={user} studentId={s.id} />
      <ReportModal open={rep} onClose={() => setRep(false)} db={db} user={user} studentId={s.id} />
      <AttendanceModal open={att} onClose={() => setAtt(false)} db={db} user={user} />
    </div>
  )
}

function TrendChart({ data }) {
  return (
    <div dir="ltr" className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#e3eaf2" vertical={false} />
          <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#5a6a7e' }} tickLine={false} axisLine={false} />
          <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: '#5a6a7e' }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`${v}%`, 'المعدل']} contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12 }} />
          <Line type="monotone" dataKey="v" stroke="#12385B" strokeWidth={3} dot={{ r: 4, fill: '#D8A642', stroke: '#12385B' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
