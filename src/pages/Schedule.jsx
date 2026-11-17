import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft, Plus, Pencil, Ban, ClipboardCheck, CalendarDays } from 'lucide-react'
import { PageHeader, Card, Select, SearchBox, Empty, Modal, Field, Notice, toast, Tabs, StatusBadge, Badge, LESSON_STATUS } from '../components/ui'
import { LessonCard, LessonDetail } from '../components/lesson'
import { LessonFormModal, run } from '../components/forms'
import { getStudent, getTeacher, getSubject, lessonSort, parentChildren } from '../lib/calc'
import { todayISO, addDays, weekStart, monthStart, addMonths, daysInMonth, fmtDateFull, fmtDate, fmtMonth, fmtDay, parseISO, WEEK_DAYS, DAY_NAMES } from '../lib/dates'
import { go } from '../lib/router'

export default function Schedule({ db, user, params }) {
  const canManage = ['admin', 'teacher'].includes(user.role)
  const [view, setView] = useState('week')
  const [date, setDate] = useState(todayISO())
  const [f, setF] = useState({ teacher: '', student: '', subject: '', status: '', q: '' })
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState(null)
  const [cancel, setCancel] = useState(null)
  const [reason, setReason] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => { if (params.lesson) { const l = db.lessons.find((x) => x.id === params.lesson); if (l) { setOpen(l.id); setDate(l.date) } } }, [params.lesson])

  const scope = useMemo(() => {
    const kids = user.role === 'parent' ? parentChildren(db, user.refId).map((k) => k.id) : null
    return db.lessons.filter((l) => user.role === 'admin' || (user.role === 'teacher' && l.teacherId === user.refId) || (user.role === 'student' && l.studentId === user.refId) || (kids && kids.includes(l.studentId)))
  }, [db, user])
  const lessons = useMemo(() => scope.filter((l) => (!f.teacher || l.teacherId === f.teacher) && (!f.student || l.studentId === f.student) && (!f.subject || l.subjectId === f.subject) && (!f.status || l.status === f.status) && (!f.q || `${getStudent(db, l.studentId)?.name} ${getTeacher(db, l.teacherId)?.name}`.includes(f.q.trim()))).sort(lessonSort), [scope, f, db])
  const cur = open ? db.lessons.find((l) => l.id === open) : null

  const step = (n) => setDate(view === 'month' ? addMonths(date, n) : addDays(date, view === 'week' ? 7 * n : n))
  const title = view === 'day' ? fmtDateFull(date) : view === 'week' ? `${fmtDate(weekStart(date))} - ${fmtDate(addDays(weekStart(date), 6))}` : fmtMonth(date)
  const teachersOpt = (user.role === 'admin' ? db.teachers : []).map((t) => ({ value: t.id, label: t.name }))
  const studentOpt = [...new Map(scope.map((l) => [l.studentId, getStudent(db, l.studentId)])).values()].filter(Boolean).map((s) => ({ value: s.id, label: s.name }))
  const card = (l, compact) => <LessonCard key={l.id} l={l} db={db} compact={compact} onClick={(x) => setOpen(x.id)} showStudent={user.role !== 'student'} showTeacher={user.role !== 'teacher'} />

  const doCancel = () => { const r = run('cancelLesson', cancel.id, reason); if (r.ok) { toast('تم إلغاء الحصة وإشعار المعنيين'); setCancel(null); setReason(''); setOpen(null) } }

  return (
    <div>
      <PageHeader title="جدول الحصص" sub="الحصة المجدولة لا تُحتسب كمنفذة إلا بعد تسجيلها" actions={canManage && <button className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} /> إضافة حصة جديدة</button>} />
      <Card className="mb-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <SearchBox value={f.q} onChange={set('q')} placeholder="بحث بالاسم" />
          {user.role === 'admin' && <Select value={f.teacher} onChange={set('teacher')} placeholder="كل المعلمين" options={teachersOpt} />}
          {user.role !== 'student' && <Select value={f.student} onChange={set('student')} placeholder="كل الطلاب" options={studentOpt} />}
          <Select value={f.subject} onChange={set('subject')} placeholder="كل المواد" options={db.subjects.map((s) => ({ value: s.id, label: s.name }))} />
          <Select value={f.status} onChange={set('status')} placeholder="كل الحالات" options={Object.entries(LESSON_STATUS).map(([v, s]) => ({ value: v, label: s.label }))} />
        </div>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button className="btn btn-outline btn-icon" onClick={() => step(-1)} aria-label="السابق"><ChevronRight size={20} /></button>
          <button className="btn btn-outline" onClick={() => setDate(todayISO())}>اليوم</button>
          <button className="btn btn-outline btn-icon" onClick={() => step(1)} aria-label="التالي"><ChevronLeft size={20} /></button>
          <h2 className="text-lg ms-2">{title}</h2>
        </div>
        <div role="tablist" className="inline-flex rounded-xl bg-mist p-1">
          {[['day', 'يومي'], ['week', 'أسبوعي'], ['month', 'شهري']].map(([id, l]) => <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`px-4 py-1.5 rounded-lg font-bold text-sm ${view === id ? 'bg-navy text-white shadow' : 'text-navy'}`}>{l}</button>)}
        </div>
      </div>

      {view === 'day' && (() => { const ls = lessons.filter((l) => l.date === date); return ls.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{ls.map((l) => card(l))}</div> : <Card><Empty icon={CalendarDays} title="لا توجد حصص في هذا اليوم" text="جرّب يومًا آخر أو عدّل عوامل التصفية." /></Card> })()}

      {view === 'week' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-7 gap-3">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i)).map((d) => {
            const ls = lessons.filter((l) => l.date === d)
            return (
              <div key={d} className={`rounded-2xl border p-2.5 min-h-40 ${d === todayISO() ? 'border-gold bg-[#fdf8ec]' : 'border-hair bg-white/60'}`}>
                <button onClick={() => { setDate(d); setView('day') }} className="text-sm font-extrabold text-navy-deep mb-2 hover:underline">{fmtDay(d)} <span className="num text-slate font-normal">{d.slice(5).replace('-', '/')}</span></button>
                <div className="flex flex-col gap-1.5">{ls.map((l) => card(l, true))}{!ls.length && <span className="text-xs text-slate">لا حصص</span>}</div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'month' && <MonthGrid date={date} lessons={lessons} db={db} onPick={(d) => { setDate(d); setView('day') }} />}

      {cur && (
        <LessonDetail l={cur} db={db} onClose={() => setOpen(null)} actions={canManage && (
          <>
            {cur.status !== 'cancelled' && <button className="btn btn-primary" onClick={() => go(`/app/record?lesson=${cur.id}`)}><ClipboardCheck size={16} /> {cur.status === 'upcoming' ? 'تسجيل الحصة' : 'تعديل التسجيل'}</button>}
            {cur.status === 'upcoming' && <button className="btn btn-outline" onClick={() => { setForm({ lesson: cur }); setOpen(null) }}><Pencil size={16} /> تعديل الموعد</button>}
            {cur.status === 'upcoming' && <button className="btn btn-danger" onClick={() => { setCancel(cur); setOpen(null) }}><Ban size={16} /> إلغاء الحصة</button>}
          </>
        )} />
      )}
      {form && <LessonFormModal open onClose={() => setForm(null)} db={db} user={user} lesson={form.lesson} defaults={form.lesson ? undefined : { date }} />}
      <Modal open={!!cancel} onClose={() => setCancel(null)} title="إلغاء الحصة" footer={<><button className="btn btn-outline" onClick={() => setCancel(null)}>تراجع</button><button className="btn btn-danger" onClick={doCancel}>تأكيد الإلغاء</button></>}>
        <Notice tone="warn">سيتم إشعار الطالب وولي الأمر والمعلم. الحصة الملغاة لا تُحتسب.</Notice>
        <Field label="سبب الإلغاء (اختياري)" id="cr" className="mt-4"><textarea id="cr" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Modal>
    </div>
  )
}

function MonthGrid({ date, lessons, db, onPick }) {
  const first = monthStart(date)
  const offset = (parseISO(first).getDay() + 1) % 7
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth(first) }, (_, i) => addDays(first, i))]
  return (
    <Card pad={false}>
      <div className="overflow-x-auto"><div className="min-w-[640px]">
        <div className="grid grid-cols-7 bg-navy text-white text-sm font-bold text-center">{WEEK_DAYS.map((d) => <div key={d} className="py-2.5">{DAY_NAMES[d]}</div>)}</div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const ls = d ? lessons.filter((l) => l.date === d) : []
            const by = (s) => ls.filter((l) => l.status === s).length
            return (
              <button key={i} disabled={!d} onClick={() => d && onPick(d)} className={`min-h-24 border-b border-s border-hair p-2 text-start align-top transition ${d ? 'hover:bg-mist' : 'bg-cream'} ${d === todayISO() ? 'bg-[#fdf8ec]' : ''}`}>
                {d && <><span className={`num text-sm font-bold ${d === todayISO() ? 'inline-flex size-6 rounded-full bg-gold text-navy-deep items-center justify-center' : ''}`}>{Number(d.slice(8))}</span>
                  <div className="mt-1 flex flex-wrap gap-1">{by('upcoming') > 0 && <Badge tone="gold">{by('upcoming')} قادمة</Badge>}{by('completed') > 0 && <Badge tone="navy">{by('completed')} مكتملة</Badge>}{ls.length - by('upcoming') - by('completed') > 0 && <Badge tone="gray">{ls.length - by('upcoming') - by('completed')} أخرى</Badge>}</div></>}
              </button>
            )
          })}
        </div>
      </div></div>
    </Card>
  )
}
