import { useState, useMemo } from 'react'
import { GraduationCap, CalendarDays, Clock, Wallet, ClipboardCheck, UserCheck, FileText, BookPlus, Eye, Sparkles, Bell, Check, Star } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { PageHeader, Card, Stat, Empty, Avatar, Badge, ProgressBar, scoreTone, money, num, Select } from '../components/ui'
import { LessonCard, LessonDetail } from '../components/lesson'
import { AttendanceModal, HomeworkModal, ReportModal } from '../components/forms'
import StudentProfile from './StudentProfile'
import { accounts, teacherStudents, getStudent, getSubject, getTeacher, lessonSort, attendanceStats, subjectScores, overallAvg, parentChildren, notificationsFor, studentTeachers } from '../lib/calc'
import { fmtDate, fmtDateTime, todayISO, weekStart, addDays, relativeDay, fmtDay } from '../lib/dates'
import { Link, go } from '../lib/router'
import { notifRoute } from './Notifications'

const hello = () => { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : h < 18 ? 'مساء الخير' : 'مساء النور' }

function LessonList({ lessons, db, onOpen, showStudent, showTeacher, empty }) {
  if (!lessons.length) return <Empty title={empty} />
  return <div className="flex flex-col gap-2.5">{lessons.map((l) => <div key={l.id}><div className="text-xs font-bold text-gold-ink mb-1">{relativeDay(l.date)} - {fmtDate(l.date)}</div><LessonCard l={l} db={db} onClick={onOpen} showStudent={showStudent} showTeacher={showTeacher} /></div>)}</div>
}
function WeekStrip({ lessons, db, onOpen, showStudent, showTeacher }) {
  const ws = weekStart(todayISO())
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
      {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((d) => {
        const ls = lessons.filter((l) => l.date === d && l.status !== 'cancelled').sort(lessonSort)
        return (
          <div key={d} className={`rounded-xl border p-2 min-h-24 ${d === todayISO() ? 'border-gold bg-[#fdf8ec]' : 'border-hair bg-white'}`}>
            <div className="text-xs font-extrabold text-navy-deep mb-2">{fmtDay(d)} <span className="text-slate font-normal num">{d.slice(8)}</span></div>
            <div className="flex flex-col gap-1.5">{ls.map((l) => <LessonCard key={l.id} l={l} db={db} compact onClick={onOpen} showStudent={showStudent} showTeacher={showTeacher} />)}{!ls.length && <span className="text-xs text-slate">-</span>}</div>
          </div>
        )
      })}
    </div>
  )
}
function Notifs({ db, user }) {
  const list = notificationsFor(db, user.id).slice(0, 5)
  return (
    <Card title="الإشعارات والتذكيرات" action={<Link to="/app/notifications" className="text-sm font-bold text-navy">الكل</Link>}>
      {list.length ? <ul className="divide-y divide-hair">{list.map((n) => <li key={n.id} className="py-2.5 flex gap-3"><span className={`mt-2 size-2 rounded-full shrink-0 ${n.readBy.includes(user.id) ? 'bg-hair' : 'bg-gold'}`} /><div><Link to={notifRoute(n, user) || '/app/notifications'} className="font-bold hover:underline">{n.title}</Link><div className="text-sm text-slate line-clamp-2">{n.body}</div><div className="text-xs text-slate mt-0.5">{fmtDateTime(n.at)}</div></div></li>)}</ul> : <Empty icon={Bell} title="لا توجد إشعارات" />}
    </Card>
  )
}

/* ---------------- Teacher ---------------- */
export function TeacherHome({ db, user }) {
  const t = getTeacher(db, user.refId)
  const [modal, setModal] = useState(null)
  const [open, setOpen] = useState(null)
  const [pick, setPick] = useState('')
  const today = todayISO()
  const acc = accounts(db).teachers[t.id]
  const students = teacherStudents(db, t.id)
  const mine = db.lessons.filter((l) => l.teacherId === t.id)
  const todays = mine.filter((l) => l.date === today && l.status !== 'cancelled').sort(lessonSort)
  const upcoming = mine.filter((l) => l.status === 'upcoming' && l.date > today).sort(lessonSort).slice(0, 4)
  const recent = db.reports.filter((r) => r.teacherId === t.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const stats = attendanceStats(mine)
  const actions = [
    [UserCheck, 'تسجيل حضور', () => setModal('att')], [ClipboardCheck, 'تسجيل حصة', () => go('/app/record')], [FileText, 'إضافة تقرير', () => setModal('rep')],
    [BookPlus, 'إضافة واجب', () => setModal('hw')], [CalendarDays, 'عرض الجدول', () => go('/app/schedule')],
  ]
  return (
    <div>
      <PageHeader title={`${hello()}، ${t.name.split(' ')[0]}`} sub={`${t.subjects.map((s) => getSubject(db, s).name).join(' • ')} - لديك ${todays.length} حصص اليوم`} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat icon={GraduationCap} label="طلابي" value={students.length} />
        <Stat icon={CalendarDays} tone="gold" label="حصص اليوم" value={todays.length} />
        <Stat icon={Clock} label="الساعات المنفذة" value={`${num(acc.hours)} س`} />
        <Stat icon={Wallet} tone="ok" label="إجمالي المستحقات" value={money(acc.earnings, db.settings)} sub={`المتبقي ${money(acc.balance, db.settings)}`} />
      </div>
      <Card className="mb-6"><div className="flex flex-wrap gap-2"><span className="font-extrabold text-navy-deep me-2 self-center">إجراءات</span>{actions.map(([I, l, f]) => <button key={l} className="btn btn-outline btn-sm" onClick={f}><I size={15} /> {l}</button>)}
        <div className="flex gap-2 items-center"><Select value={pick} onChange={(v) => { setPick(''); if (v) go(`/app/students/${v}`) }} placeholder="عرض ملف الطالب..." options={students.map((s) => ({ value: s.id, label: s.name }))} className="!min-h-0 !py-1.5 text-sm" /></div></div></Card>
      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Card title="حصص اليوم"><LessonList lessons={todays.map((l) => l)} db={db} onOpen={setOpen} showTeacher={false} empty="لا توجد حصص اليوم" /></Card>
        <Card title="الحصص القادمة"><LessonList lessons={upcoming} db={db} onOpen={setOpen} showTeacher={false} empty="لا توجد حصص قادمة" /></Card>
      </div>
      <Card title="التقويم الأسبوعي" className="mb-6"><WeekStrip lessons={mine} db={db} onOpen={setOpen} showTeacher={false} /></Card>
      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Card title="طلابي" action={<Link to="/app/students" className="text-sm font-bold text-navy">الكل</Link>}>
          <ul className="grid sm:grid-cols-2 gap-2">{students.map((s) => <li key={s.id}><Link to={`/app/students/${s.id}`} className="flex items-center gap-2.5 rounded-xl border border-hair p-2.5 hover:bg-mist"><Avatar name={s.name} size={34} /><span className="min-w-0"><b className="block truncate text-sm">{s.name}</b><span className="text-xs text-slate">{s.grade}</span></span></Link></li>)}</ul>
        </Card>
        <Card title="سجل الحضور" ><div className="grid grid-cols-4 gap-2 text-center mb-3"><Stat label="مسجلة" value={stats.total} /><Stat label="حضور" value={stats.present} /><Stat label="غياب" value={stats.absent} /><Stat label="النسبة" value={`${stats.rate}%`} /></div>
          <ul className="divide-y divide-hair text-sm">{mine.filter((l) => ['completed', 'absent'].includes(l.status)).sort((a, b) => lessonSort(b, a)).slice(0, 5).map((l) => <li key={l.id} className="flex justify-between py-2"><span>{getStudent(db, l.studentId)?.name}</span><span className="text-slate">{fmtDate(l.date)} • {l.status === 'absent' ? 'غائب' : 'حاضر'}</span></li>)}</ul></Card>
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="آخر تقارير الحصص">{recent.length ? <ul className="flex flex-col gap-3">{recent.map((r) => <li key={r.id} className="rounded-xl bg-mist p-3 text-sm"><div className="font-bold">{getStudent(db, r.studentId)?.name} • {getSubject(db, r.subjectId)?.name}</div><p className="text-slate mt-1">{r.text}</p></li>)}</ul> : <Empty title="لا توجد تقارير" />}</Card>
        <Notifs db={db} user={user} />
      </div>
      {open && <LessonDetail l={open} db={db} onClose={() => setOpen(null)} actions={open.status === 'upcoming' && <button className="btn btn-primary" onClick={() => go(`/app/record?lesson=${open.id}`)}>تسجيل الحصة</button>} />}
      <AttendanceModal open={modal === 'att'} onClose={() => setModal(null)} db={db} user={user} />
      <HomeworkModal open={modal === 'hw'} onClose={() => setModal(null)} db={db} user={user} />
      <ReportModal open={modal === 'rep'} onClose={() => setModal(null)} db={db} user={user} />
    </div>
  )
}

/* ---------------- Student ---------------- */
function Progress({ db, studentId }) {
  const scores = subjectScores(db, studentId)
  if (!scores.length) return <Empty title="لا توجد تقييمات بعد" />
  return (
    <div className="flex flex-col gap-3">{scores.map((r) => <div key={r.subjectId}><div className="flex justify-between text-sm mb-1"><b>{getSubject(db, r.subjectId).name}</b><span className="num font-bold">{r.avg}%</span></div><ProgressBar value={r.avg} tone={scoreTone(r.avg)} /></div>)}</div>
  )
}
function ChildSummary({ db, user, s, parentView }) {
  const [open, setOpen] = useState(null)
  const today = todayISO()
  const lessons = db.lessons.filter((l) => l.studentId === s.id)
  const todays = lessons.filter((l) => l.date === today && l.status !== 'cancelled').sort(lessonSort)
  const upcoming = lessons.filter((l) => l.status === 'upcoming' && l.date > today).sort(lessonSort).slice(0, 4)
  const recent = lessons.filter((l) => l.status === 'completed' && l.summary).sort((a, b) => lessonSort(b, a)).slice(0, 3)
  const st = attendanceStats(lessons)
  const scores = subjectScores(db, s.id)
  const hw = db.homework.filter((h) => h.studentId === s.id && h.status === 'pending').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const reports = db.reports.filter((r) => r.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const acc = accounts(db).students[s.id]
  const bars = scores.map((r) => ({ name: getSubject(db, r.subjectId).name, v: r.avg, c: getSubject(db, r.subjectId).color }))
  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat icon={CalendarDays} tone="gold" label="حصص اليوم" value={todays.length} />
        <Stat icon={Check} tone="ok" label="نسبة الحضور" value={`${st.rate}%`} sub={`${st.absent} غياب`} />
        <Stat icon={Star} label="المعدل الدراسي" value={scores.length ? `${overallAvg(scores)}%` : '-'} />
        {parentView ? <Stat icon={Wallet} tone={acc.balance > 0 ? 'bad' : 'ok'} label="المتبقي من الرسوم" value={money(acc.balance, db.settings)} /> : <Stat icon={Clock} label="واجبات معلّقة" value={hw.length} />}
      </div>
      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Card title="حصص اليوم"><LessonList lessons={todays} db={db} onOpen={setOpen} showStudent={false} empty="لا توجد حصص اليوم" /></Card>
        <Card title="الحصص القادمة"><LessonList lessons={upcoming} db={db} onOpen={setOpen} showStudent={false} empty="لا توجد حصص قادمة" /></Card>
      </div>
      <Card title="الجدول الأسبوعي" className="mb-6"><WeekStrip lessons={lessons} db={db} onOpen={setOpen} showStudent={false} /></Card>
      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Card title="التقدّم في المواد">{bars.length ? <><div dir="ltr" className="h-56 mb-2"><ResponsiveContainer width="100%" height="100%"><BarChart data={bars} margin={{ left: -20, right: 4 }}><CartesianGrid stroke="#e3eaf2" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5a6a7e' }} tickLine={false} axisLine={false} interval={0} /><YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#5a6a7e' }} tickLine={false} axisLine={false} /><Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12 }} /><Bar dataKey="v" name="المعدل" radius={[6, 6, 0, 0]}>{bars.map((b, i) => <Cell key={i} fill={b.c} />)}</Bar></BarChart></ResponsiveContainer></div></> : <Empty title="لا توجد تقييمات" />}</Card>
        <Card title="ملاحظات المعلمين">{reports.length ? <ul className="flex flex-col gap-3">{reports.map((r) => <li key={r.id} className="rounded-xl bg-mist p-3 text-sm"><div className="font-bold">{getSubject(db, r.subjectId)?.name} • {getTeacher(db, r.teacherId)?.name} <span className="text-gold">{'★'.repeat(r.rating)}</span></div><p className="text-slate mt-1">{r.text}</p></li>)}</ul> : <Empty title="لا توجد ملاحظات" />}</Card>
      </div>
      <div className="grid xl:grid-cols-2 gap-6 mb-6">
        <Card title="الواجبات المعلّقة">{hw.length ? <ul className="divide-y divide-hair">{hw.slice(0, 5).map((h) => <li key={h.id} className="py-2.5 flex justify-between gap-3"><span><b className="block">{h.title}</b><span className="text-xs text-slate">{getSubject(db, h.subjectId)?.name}</span></span><Badge tone={h.dueDate < todayISO() ? 'bad' : 'warn'}>{fmtDate(h.dueDate)}</Badge></li>)}</ul> : <Empty title="لا توجد واجبات معلّقة" text="أحسنت! لا شيء متأخر." />}</Card>
        <Card title="ملخصات الحصص الأخيرة">{recent.length ? <ul className="flex flex-col gap-3">{recent.map((l) => <li key={l.id} className="text-sm"><div className="font-bold">{getSubject(db, l.subjectId)?.name} • {fmtDate(l.date)}</div><p className="text-slate">{l.summary}</p></li>)}</ul> : <Empty title="لا توجد ملخصات" />}</Card>
      </div>
      <Notifs db={db} user={user} />
      {open && <LessonDetail l={open} db={db} onClose={() => setOpen(null)} />}
    </>
  )
}
export function StudentHome({ db, user }) {
  const s = getStudent(db, user.refId)
  const teachers = studentTeachers(db, s)
  return (
    <div>
      <PageHeader title={`${hello()}، ${s.name.split(' ')[0]}`} sub="كل خطوة صغيرة اليوم تقرّبك من هدفك. استمر، أنت تتقدّم!" />
      <Card className="mb-6"><div className="flex items-center gap-2 mb-3 font-extrabold text-navy-deep"><Sparkles size={18} className="text-gold-ink" /> موادي ومعلمي</div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{s.assignments.map((a) => <div key={a.subjectId} className="flex items-center gap-3 rounded-xl border border-hair p-3"><span className="h-10 w-1.5 rounded" style={{ background: getSubject(db, a.subjectId).color }} /><div><b>{getSubject(db, a.subjectId).name}</b><div className="text-xs text-slate">{getTeacher(db, a.teacherId)?.name}</div></div></div>)}</div></Card>
      <ChildSummary db={db} user={user} s={s} />
    </div>
  )
}

/* ---------------- Parent ---------------- */
function useChild(db, user) {
  const kids = parentChildren(db, user.refId)
  const [sel, setSel] = useState(kids[0]?.id)
  const child = kids.find((k) => k.id === sel) || kids[0]
  return { kids, child, setSel }
}
function ChildSwitch({ kids, child, setSel }) {
  if (kids.length < 2) return null
  return (
    <div role="tablist" aria-label="اختيار الابن" className="flex flex-wrap gap-2 mb-6">
      {kids.map((k) => <button key={k.id} role="tab" aria-selected={child.id === k.id} onClick={() => setSel(k.id)} className={`flex items-center gap-2.5 rounded-full ps-1.5 pe-4 py-1.5 border font-bold transition ${child.id === k.id ? 'bg-navy text-white border-navy' : 'bg-white border-hair text-navy-deep hover:border-navy'}`}><Avatar name={k.name} size={30} />{k.name.split(' ')[0]}</button>)}
    </div>
  )
}
export function ParentHome({ db, user }) {
  const p = db.parents.find((x) => x.id === user.refId)
  const { kids, child, setSel } = useChild(db, user)
  const acc = accounts(db).students
  if (!child) return <Empty title="لا يوجد أبناء مرتبطون بحسابك" />
  return (
    <div>
      <PageHeader title={`${hello()}، ${p.name.split(' ')[0]} ${p.name.split(' ')[1] || ''}`} sub="نتابع معك رحلة أبنائك خطوة بخطوة" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {kids.map((k) => { const a = acc[k.id]; const sc = overallAvg(subjectScores(db, k.id)); const st = attendanceStats(db.lessons.filter((l) => l.studentId === k.id)); return (
          <button key={k.id} onClick={() => setSel(k.id)} className={`card p-4 text-start transition hover:-translate-y-0.5 ${child.id === k.id ? '!border-gold ring-2 ring-gold/40' : ''}`}>
            <div className="flex items-center gap-3 mb-3"><Avatar name={k.name} size={48} /><div><div className="font-extrabold text-navy-deep">{k.name}</div><div className="text-xs text-slate">{k.grade}</div></div></div>
            <div className="grid grid-cols-3 text-center text-xs gap-1"><div><b className="block text-base num">{sc || '-'}%</b>المعدل</div><div><b className="block text-base num">{st.rate}%</b>الحضور</div><div><b className={`block text-base num ${a.balance > 0 ? 'text-bad-ink' : 'text-ok-ink'}`}>{money(a.balance, db.settings)}</b>المتبقي</div></div>
          </button>
        ) })}
      </div>
      <ChildSwitch kids={kids} child={child} setSel={setSel} />
      <div className="text-lg font-extrabold text-navy-deep mb-4">متابعة {child.name.split(' ')[0]}</div>
      <ChildSummary key={child.id} db={db} user={user} s={child} parentView />
    </div>
  )
}

/* progress / homework / payments pages for parent and student */
export function ChildView({ db, user, kind }) {
  const isParent = user.role === 'parent'
  const kids = isParent ? parentChildren(db, user.refId) : [getStudent(db, user.refId)]
  const [sel, setSel] = useState(kids[0]?.id)
  const child = kids.find((k) => k.id === sel) || kids[0]
  if (!child) return <Empty title="لا يوجد أبناء مرتبطون بحسابك" />
  const tabs = { progress: ['level', 'attendance', 'reports'], homework: ['homework'], payments: ['finance'] }[kind]
  const titles = { progress: 'المستوى الدراسي والتقارير', homework: 'الواجبات', payments: 'المدفوعات والمستحقات' }
  return (
    <div>
      <PageHeader title={titles[kind]} sub={isParent ? undefined : child.name} />
      <ChildSwitch kids={kids} child={child} setSel={setSel} />
      <StudentProfile key={`${child.id}-${kind}`} db={db} user={user} id={child.id} tabs={tabs} embedded />
    </div>
  )
}
