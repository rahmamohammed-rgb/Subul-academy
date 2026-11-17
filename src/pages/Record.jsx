import { useEffect, useMemo, useRef, useState } from 'react'
import { Save, RotateCcw, Pencil, Trash2, Download } from 'lucide-react'
import { PageHeader, Card, Field, Select, SearchBox, DataTable, StatusBadge, Notice, Confirm, toast, downloadCSV, ATTENDANCE } from '../components/ui'
import { run } from '../components/forms'
import { getStudent, getTeacher, getSubject, teacherStudents, lessonSort, lessonMinutes } from '../lib/calc'
import { todayISO, fmtDate, fmtTime, hoursLabel, nowHHMM, toMin, fromMin } from '../lib/dates'
import { go } from '../lib/router'

const blank = (user, db) => ({ id: null, date: todayISO(), teacherId: user.role === 'teacher' ? user.refId : '', studentId: '', subjectId: '', start: '16:00', end: '17:00', actualStart: '16:00', actualEnd: '17:00', attendance: 'present', completion: 'completed', summary: '', homework: '', perfNote: '', notes: '', type: 'inperson' })

export default function Record({ db, user, params }) {
  const isT = user.role === 'teacher'
  const [f, setF] = useState(() => blank(user, db))
  const [errors, setErrors] = useState({})
  const [conflicts, setConflicts] = useState([])
  const [ignore, setIgnore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [h, setH] = useState({ teacher: '', student: '', subject: '', status: '', from: '', to: '' })
  const [del, setDel] = useState(null)
  const top = useRef(null)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const reset = () => { setF(blank(user, db)); setErrors({}); setConflicts([]); setIgnore(false) }

  const load = (l) => {
    setF({ id: l.id, date: l.date, teacherId: l.teacherId, studentId: l.studentId, subjectId: l.subjectId, start: l.start, end: l.end, type: l.type,
      actualStart: l.actualStart || l.start, actualEnd: l.actualEnd || l.end, attendance: l.attendance || 'present', completion: l.status === 'incomplete' ? 'incomplete' : 'completed',
      summary: l.summary || '', homework: l.homework || '', perfNote: l.perfNote || '', notes: l.notes || '' })
    setErrors({}); setConflicts([]); setIgnore(false)
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  useEffect(() => { if (params.lesson) { const l = db.lessons.find((x) => x.id === params.lesson); if (l && (!isT || l.teacherId === user.refId)) load(l) } }, [params.lesson])

  const teacherOpts = (isT ? db.teachers.filter((t) => t.id === user.refId) : db.teachers).map((t) => ({ value: t.id, label: t.name }))
  const studentPool = f.teacherId ? teacherStudents(db, f.teacherId) : db.students
  const subjectPool = (() => { const s = getStudent(db, f.studentId); if (s && f.teacherId) return s.assignments.filter((a) => a.teacherId === f.teacherId).map((a) => a.subjectId); if (f.teacherId) return getTeacher(db, f.teacherId)?.subjects || []; return db.subjects.map((x) => x.id) })()
  const pending = db.lessons.filter((l) => l.status === 'upcoming' && l.date <= todayISO() && (!isT || l.teacherId === user.refId)).sort((a, b) => lessonSort(b, a)).slice(0, 30)

  const save = (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const r = run('recordLesson', { ...f, ignoreConflicts: ignore })
    setTimeout(() => setBusy(false), 400)
    if (r.ok) { toast(f.id ? 'تم تحديث تسجيل الحصة وإعادة احتساب الرسوم والمستحقات' : 'تم حفظ تسجيل الحصة بنجاح'); reset(); setErrors({}); return }
    setErrors(r.errors || {})
    setConflicts(r.conflicts || [])
  }
  const err = (k) => errors[k]
  const absent = f.attendance === 'absent'
  const mins = f.actualStart && f.actualEnd ? toMin(f.actualEnd) - toMin(f.actualStart) : 0

  const rows = useMemo(() => db.lessons.filter((l) => ['completed', 'absent', 'incomplete'].includes(l.status) && (!isT || l.teacherId === user.refId)
    && (!h.teacher || l.teacherId === h.teacher) && (!h.student || l.studentId === h.student) && (!h.subject || l.subjectId === h.subject) && (!h.status || l.status === h.status)
    && (!h.from || l.date >= h.from) && (!h.to || l.date <= h.to) && (!q || `${getStudent(db, l.studentId)?.name} ${getTeacher(db, l.teacherId)?.name} ${l.summary}`.includes(q.trim()))).sort((a, b) => lessonSort(b, a)), [db, h, q, user])
  const cols = [
    { key: 'date', label: 'التاريخ', render: (l) => fmtDate(l.date), csv: (l) => l.date },
    { key: 'teacher', label: 'المعلم', render: (l) => getTeacher(db, l.teacherId)?.name, csv: (l) => getTeacher(db, l.teacherId)?.name },
    { key: 'student', label: 'الطالب', render: (l) => getStudent(db, l.studentId)?.name, csv: (l) => getStudent(db, l.studentId)?.name },
    { key: 'subject', label: 'المادة', render: (l) => getSubject(db, l.subjectId)?.name, csv: (l) => getSubject(db, l.subjectId)?.name },
    { key: 'dur', label: 'المدة الفعلية', render: (l) => hoursLabel(l.actualMinutes || 0), csv: (l) => l.actualMinutes || 0 },
    { key: 'status', label: 'الحالة', render: (l) => <StatusBadge status={l.status} />, csv: (l) => l.status },
    { key: 'act', label: 'إجراءات', csv: () => '', render: (l) => (
      <span className="flex gap-1">
        <button className="btn btn-ghost btn-sm btn-icon" aria-label="تعديل التسجيل" onClick={() => load(l)}><Pencil size={16} /></button>
        {user.role === 'admin' && <button className="btn btn-ghost btn-sm btn-icon text-bad-ink" aria-label="حذف التسجيل" onClick={() => setDel(l)}><Trash2 size={16} /></button>}
      </span>) },
  ]
  const Sel = ({ k, options, ph }) => <Select value={h[k]} onChange={(v) => setH({ ...h, [k]: v })} placeholder={ph} options={options} />

  return (
    <div>
      <div ref={top} className="scroll-mt-20" />
      <PageHeader title="تسجيل الحصص" sub="سجّل الحصة المنفذة ليتم احتساب الساعات والرسوم والمستحقات تلقائيًا" />
      <form onSubmit={save} noValidate className="card card-pad mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl">{f.id ? `تعديل تسجيل الحصة ${f.id}` : 'نموذج تسجيل حصة'}</h2>
          <div className="flex gap-2 items-center">
            {!f.id && pending.length > 0 && <select className="select !min-h-0 !py-2 text-sm max-w-64" aria-label="تعبئة من حصة مجدولة" value="" onChange={(e) => { const l = db.lessons.find((x) => x.id === e.target.value); if (l) load(l) }}><option value="">تعبئة من حصة مجدولة...</option>{pending.map((l) => <option key={l.id} value={l.id}>{fmtDate(l.date)} • {getStudent(db, l.studentId)?.name} • {getSubject(db, l.subjectId)?.name}</option>)}</select>}
            {f.id && <button type="button" className="btn btn-outline btn-sm" onClick={reset}><RotateCcw size={15} /> تسجيل جديد</button>}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="اسم الأكاديمية" id="r-ac"><input id="r-ac" className="input bg-mist" readOnly value={db.settings.academyName} /></Field>
          <Field label="تاريخ الحصة" required id="r-d" error={err('date')}><input id="r-d" type="date" className="input" max={todayISO()} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="المعلم" required id="r-t" error={err('teacherId')}>
            <select id="r-t" className="select" disabled={isT} value={f.teacherId} onChange={(e) => setF({ ...f, teacherId: e.target.value, studentId: '', subjectId: '' })}><option value="">اختر المعلم</option>{teacherOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </Field>
          <Field label="الطالب" required id="r-s" error={err('studentId')}>
            <select id="r-s" className="select" value={f.studentId} onChange={(e) => { const s = getStudent(db, e.target.value); const subs = s && f.teacherId ? s.assignments.filter((a) => a.teacherId === f.teacherId).map((a) => a.subjectId) : []; setF({ ...f, studentId: e.target.value, subjectId: subs.length === 1 ? subs[0] : '' }) }}><option value="">اختر الطالب</option>{studentPool.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </Field>
          <Field label="المادة" required id="r-sub" error={err('subjectId')}>
            <select id="r-sub" className="select" value={f.subjectId} onChange={(e) => set('subjectId', e.target.value)}><option value="">اختر المادة</option>{subjectPool.map((id) => <option key={id} value={id}>{getSubject(db, id)?.name}</option>)}</select>
          </Field>
          <Field label="الموعد المجدول" required id="r-st" error={err('start') || err('end')}>
            <div className="flex items-center gap-2"><input id="r-st" type="time" className="input" value={f.start} onChange={(e) => set('start', e.target.value)} aria-label="بداية الموعد المجدول" /><span>إلى</span><input type="time" className="input" value={f.end} onChange={(e) => set('end', e.target.value)} aria-label="نهاية الموعد المجدول" /></div>
          </Field>
          <Field label="حالة الحضور" required id="r-at" error={err('attendance')}>
            <select id="r-at" className="select" value={f.attendance} onChange={(e) => set('attendance', e.target.value)}>{Object.entries(ATTENDANCE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          {!absent && <Field label="وقت البدء الفعلي" required id="r-as" error={err('actualStart')}><input id="r-as" type="time" className="input" value={f.actualStart} onChange={(e) => set('actualStart', e.target.value)} /></Field>}
          {!absent && <Field label="وقت الانتهاء الفعلي" required id="r-ae" error={err('actualEnd')} hint={mins > 0 ? `المدة الفعلية: ${hoursLabel(mins)}` : undefined}><input id="r-ae" type="time" className="input" value={f.actualEnd} onChange={(e) => set('actualEnd', e.target.value)} /></Field>}
          <Field label="حالة الحصة" required id="r-co" error={err('completion')}>
            <select id="r-co" className="select" disabled={absent} value={absent ? 'incomplete' : f.completion} onChange={(e) => set('completion', e.target.value)}><option value="completed">مكتملة</option><option value="incomplete">غير مكتملة</option></select>
          </Field>
        </div>
        {absent && <Notice tone="warn" className="mt-4">غياب الطالب يُسجَّل بدون ساعات، ولا يُحتسب افتراضيًا في الرسوم أو مستحقات المعلم (حسب إعدادات الفوترة).</Notice>}
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Field label="ملخص الحصة" required={!absent && f.completion === 'completed'} id="r-sum" error={err('summary')} className="lg:col-span-2"><textarea id="r-sum" className="textarea" value={f.summary} onChange={(e) => set('summary', e.target.value)} placeholder="ماذا تناولت الحصة؟" /></Field>
          <Field label="الواجب / الخطوات القادمة" id="r-hw"><textarea id="r-hw" className="textarea !min-h-20" value={f.homework} onChange={(e) => set('homework', e.target.value)} /></Field>
          <Field label="ملاحظات الأداء" id="r-pf"><textarea id="r-pf" className="textarea !min-h-20" value={f.perfNote} onChange={(e) => set('perfNote', e.target.value)} /></Field>
          <Field label="ملاحظات إضافية" id="r-nt" className="lg:col-span-2"><input id="r-nt" className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        </div>
        {conflicts.length > 0 && <Notice tone="warn" className="mt-4"><div>يوجد تعارض مع حصة أخرى لنفس المعلم أو الطالب في هذا الوقت.</div><label className="flex items-center gap-2 mt-2 font-semibold cursor-pointer"><input type="checkbox" checked={ignore} onChange={(e) => setIgnore(e.target.checked)} /> أؤكد الحفظ رغم التعارض</label></Notice>}
        <div className="mt-6 flex flex-wrap gap-3 justify-end"><button type="button" className="btn btn-outline" onClick={reset}>مسح النموذج</button><button type="submit" disabled={busy} className="btn btn-primary !px-8"><Save size={18} /> حفظ تسجيل الحصة</button></div>
      </form>

      <Card title="سجل الحصص" action={<button className="btn btn-outline btn-sm" onClick={() => downloadCSV('lesson-history.csv', cols.filter((c) => c.key !== 'act'), rows)}><Download size={15} /> تصدير CSV</button>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="lg:col-span-2"><SearchBox value={q} onChange={setQ} placeholder="بحث بالطالب أو المعلم أو الملخص" /></div>
          {!isT && <Sel k="teacher" ph="كل المعلمين" options={db.teachers.map((t) => ({ value: t.id, label: t.name }))} />}
          <Sel k="student" ph="كل الطلاب" options={(isT ? teacherStudents(db, user.refId) : db.students).map((s) => ({ value: s.id, label: s.name }))} />
          <Sel k="subject" ph="كل المواد" options={db.subjects.map((s) => ({ value: s.id, label: s.name }))} />
          <Sel k="status" ph="كل الحالات" options={[{ value: 'completed', label: 'مكتملة' }, { value: 'incomplete', label: 'غير مكتملة' }, { value: 'absent', label: 'لم يحضر الطالب' }]} />
          <input type="date" className="input" aria-label="من تاريخ" value={h.from} onChange={(e) => setH({ ...h, from: e.target.value })} />
          <input type="date" className="input" aria-label="إلى تاريخ" value={h.to} onChange={(e) => setH({ ...h, to: e.target.value })} />
        </div>
        <div className="text-sm text-slate mb-3">{rows.length} سجلًا</div>
        <DataTable rows={rows.slice(0, 80)} columns={cols} empty={{ title: 'لا توجد سجلات مطابقة' }} />
        {rows.length > 80 && <p className="text-xs text-slate mt-3">يُعرض أحدث 80 سجلًا. استخدم التصفية أو التصدير لعرض الباقي.</p>}
      </Card>
      <Confirm open={!!del} onClose={() => setDel(null)} title="حذف سجل الحصة" text="سيتم حذف الحصة وإعادة احتساب الرسوم والمستحقات. هل أنت متأكد؟" onConfirm={() => { run('deleteLesson', del.id); toast('تم حذف السجل'); setDel(null) }} />
    </div>
  )
}
