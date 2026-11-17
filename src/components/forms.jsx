import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal, Field, Notice, toast, Avatar, money, ATTENDANCE, StatusBadge } from './ui'
import { act } from '../lib/store'
import { GRADES } from '../lib/seed'
import { accounts, findConflicts, getStudent, getTeacher, getSubject, teacherStudents, lessonSort } from '../lib/calc'
import { addDays, todayISO, toMin, fromMin, fmtTime } from '../lib/dates'

export const run = (name, ...args) => {
  const r = act(name, ...args)
  if (r?.ok === false) toast(r.error || 'تعذر تنفيذ العملية', 'bad')
  return r
}
const Err = ({ children }) => (children ? <p className="text-xs font-semibold text-bad-ink mt-1" role="alert">{children}</p> : null)

/* ---------------- Lesson (schedule) ---------------- */
export function LessonFormModal({ open, onClose, db, user, lesson, defaults, onSaved }) {
  const forcedTeacher = user.role === 'teacher' ? user.refId : null
  const init = () => ({
    teacherId: forcedTeacher || '', studentId: '', subjectId: '', date: todayISO(), start: '16:00',
    end: fromMin(toMin('16:00') + db.settings.defaultDuration), type: 'inperson', notes: '', ...defaults, ...(lesson || {}),
  })
  const [f, setF] = useState(init)
  const [errors, setErrors] = useState({})
  const [conflicts, setConflicts] = useState([])
  const [ignore, setIgnore] = useState(false)
  useEffect(() => { if (open) { setF(init()); setErrors({}); setConflicts([]); setIgnore(false) } }, [open])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const students = f.teacherId ? teacherStudents(db, f.teacherId) : db.students
  const teachers = forcedTeacher ? db.teachers.filter((t) => t.id === forcedTeacher) : f.studentId ? db.teachers.filter((t) => getStudent(db, f.studentId)?.assignments.some((a) => a.teacherId === t.id)) : db.teachers
  const st = getStudent(db, f.studentId)
  const subjects = st && f.teacherId ? st.assignments.filter((a) => a.teacherId === f.teacherId).map((a) => a.subjectId) : []
  useEffect(() => { if (subjects.length === 1 && f.subjectId !== subjects[0]) set('subjectId', subjects[0]) }, [f.teacherId, f.studentId])
  const dur = f.start && f.end ? toMin(f.end) - toMin(f.start) : 0
  const submit = () => {
    const r = run('saveLesson', { ...f, ignoreConflicts: ignore }, lesson?.id)
    if (r.ok) { toast(lesson ? 'تم تحديث الحصة' : 'تمت جدولة الحصة بنجاح'); onSaved?.(r.id); onClose() }
    else { setErrors(r.errors || {}); setConflicts(r.conflicts || []) }
  }
  return (
    <Modal open={open} onClose={onClose} title={lesson ? 'تعديل الحصة' : 'إضافة حصة جديدة'} footer={<>
      <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
      <button className="btn btn-primary" onClick={submit} disabled={conflicts.length > 0 && !ignore}>{lesson ? 'حفظ التعديلات' : 'جدولة الحصة'}</button>
    </>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="المعلم" required error={errors.teacherId} id="lf-t">
          <select id="lf-t" className="select" value={f.teacherId} disabled={!!forcedTeacher} onChange={(e) => { set('teacherId', e.target.value); set('subjectId', '') }} aria-invalid={!!errors.teacherId}>
            <option value="">اختر المعلم</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="الطالب" required error={errors.studentId} id="lf-s">
          <select id="lf-s" className="select" value={f.studentId} onChange={(e) => { set('studentId', e.target.value); set('subjectId', '') }} aria-invalid={!!errors.studentId}>
            <option value="">اختر الطالب</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="المادة" required error={errors.subjectId} id="lf-sub" hint={f.teacherId && f.studentId && !subjects.length ? 'لا توجد مادة مشتركة بين هذا المعلم والطالب' : undefined}>
          <select id="lf-sub" className="select" value={f.subjectId} onChange={(e) => set('subjectId', e.target.value)} aria-invalid={!!errors.subjectId}>
            <option value="">اختر المادة</option>
            {subjects.map((s) => <option key={s} value={s}>{getSubject(db, s).name}</option>)}
          </select>
        </Field>
        <Field label="التاريخ" required error={errors.date} id="lf-d"><input id="lf-d" type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="وقت البداية" required error={errors.start} id="lf-st">
          <input id="lf-st" type="time" className="input" value={f.start} onChange={(e) => { const d = dur > 0 ? dur : db.settings.defaultDuration; set('start', e.target.value); if (e.target.value) set('end', fromMin(toMin(e.target.value) + d)) }} />
        </Field>
        <Field label="وقت النهاية" required error={errors.end} id="lf-en"><input id="lf-en" type="time" className="input" value={f.end} onChange={(e) => set('end', e.target.value)} aria-invalid={!!errors.end} /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-sm text-slate">المدة السريعة:</span>
        {db.settings.durations.map((m) => (
          <button key={m} type="button" onClick={() => f.start && set('end', fromMin(toMin(f.start) + m))} className={`btn btn-sm ${dur === m ? 'btn-primary' : 'btn-outline'}`}>{m} دقيقة</button>
        ))}
        {dur > 0 && <span className="text-sm font-bold text-navy">المدة: {dur} دقيقة</span>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Field label="نوع الحصة" id="lf-ty">
          <select id="lf-ty" className="select" value={f.type} onChange={(e) => set('type', e.target.value)}>
            <option value="inperson">حضوري</option>
            <option value="online">عن بُعد (أونلاين)</option>
          </select>
        </Field>
        <Field label="ملاحظات (اختياري)" id="lf-n"><input id="lf-n" className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="مثال: مراجعة قبل الاختبار" /></Field>
      </div>
      {conflicts.length > 0 && (
        <Notice tone="warn" className="mt-4">
          <div className="mb-1">تنبيه: يوجد تعارض مع {conflicts.length} حصة:</div>
          <ul className="list-disc ps-5 font-medium">
            {conflicts.map((c) => <li key={c.id}>{getStudent(db, c.studentId)?.name} مع {getTeacher(db, c.teacherId)?.name} ({fmtTime(c.start)} - {fmtTime(c.end)})</li>)}
          </ul>
          <label className="flex items-center gap-2 mt-2 cursor-pointer"><input type="checkbox" checked={ignore} onChange={(e) => setIgnore(e.target.checked)} className="size-4 accent-[#12385B]" /> أؤكد الحفظ رغم التعارض</label>
        </Notice>
      )}
    </Modal>
  )
}

/* ---------------- Teacher ---------------- */
export function TeacherFormModal({ open, onClose, db, teacher, onSaved }) {
  const blank = { name: '', gender: 'm', subjects: [], rate: 100, experience: 1, qualifications: '', bio: '', phone: '', email: '' }
  const [f, setF] = useState(blank)
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setF(teacher ? { ...blank, ...teacher } : blank); setErr('') } }, [open])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const submit = () => {
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return setErr('البريد الإلكتروني غير صالح')
    const r = teacher ? run('updateTeacher', teacher.id, f) : run('addTeacher', f)
    if (r.ok) { toast(teacher ? 'تم تحديث بيانات المعلم' : 'تمت إضافة المعلم'); onSaved?.(r.id); onClose() } else setErr(r.error)
  }
  return (
    <Modal open={open} onClose={onClose} title={teacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'} footer={<><button className="btn btn-outline" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={submit}>{teacher ? 'حفظ' : 'إضافة المعلم'}</button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="الاسم الكامل" required id="tf-n"><input id="tf-n" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="أجر الساعة (يدفعه الأكاديمية)" required id="tf-r" hint={`بعملة ${db.settings.currency === 'USD' ? 'الدولار' : 'الجنيه المصري'}`}><input id="tf-r" type="number" min="1" className="input" value={f.rate} onChange={(e) => set('rate', e.target.value)} /></Field>
        <Field label="سنوات الخبرة" id="tf-e"><input id="tf-e" type="number" min="0" className="input" value={f.experience} onChange={(e) => set('experience', Number(e.target.value))} /></Field>
        <Field label="الجنس" id="tf-g"><select id="tf-g" className="select" value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="m">ذكر</option><option value="f">أنثى</option></select></Field>
        <Field label="الهاتف" id="tf-p"><input id="tf-p" className="input" dir="ltr" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="البريد الإلكتروني" id="tf-m"><input id="tf-m" className="input" dir="ltr" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
      </div>
      <div className="mt-4">
        <span className="label">المواد التي يدرّسها <span className="text-bad-ink">*</span></span>
        <div className="flex flex-wrap gap-2">
          {db.subjects.map((s) => {
            const on = f.subjects.includes(s.id)
            return <button type="button" key={s.id} aria-pressed={on} onClick={() => set('subjects', on ? f.subjects.filter((x) => x !== s.id) : [...f.subjects, s.id])} className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline'}`}>{s.name}</button>
          })}
        </div>
      </div>
      <Field label="المؤهلات" className="mt-4" id="tf-q"><input id="tf-q" className="input" value={f.qualifications} onChange={(e) => set('qualifications', e.target.value)} /></Field>
      <Field label="نبذة تعريفية" className="mt-4" id="tf-b"><textarea id="tf-b" className="textarea" value={f.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
      <Err>{err}</Err>
    </Modal>
  )
}

/* ---------------- Student ---------------- */
export function StudentFormModal({ open, onClose, db, student, onSaved }) {
  const blank = { name: '', gender: 'm', grade: GRADES[0], parentId: '', fee: 150, assignments: [{ subjectId: '', teacherId: '' }], notes: '' }
  const [f, setF] = useState(blank)
  const [np, setNp] = useState({ name: '', phone: '', email: '' })
  const [newParent, setNewParent] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setF(student ? { ...blank, ...student } : blank); setNewParent(false); setNp({ name: '', phone: '', email: '' }); setErr('') } }, [open])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const setA = (i, k, v) => set('assignments', f.assignments.map((a, j) => (j === i ? { ...a, [k]: v, ...(k === 'subjectId' ? { teacherId: '' } : {}) } : a)))
  const submit = () => {
    let parentId = f.parentId
    if (newParent) {
      if (!np.name.trim()) return setErr('أدخل اسم ولي الأمر الجديد')
      const r0 = run('addParent', np)
      if (!r0.ok) return
      parentId = r0.id
    }
    const data = { ...f, parentId }
    const r = student ? run('updateStudent', student.id, data) : run('addStudent', data)
    if (r.ok) { toast(student ? 'تم تحديث بيانات الطالب' : 'تمت إضافة الطالب وربطه بولي الأمر والمعلم'); onSaved?.(r.id); onClose() } else setErr(r.error)
  }
  return (
    <Modal open={open} onClose={onClose} size="lg" title={student ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'} footer={<><button className="btn btn-outline" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={submit}>{student ? 'حفظ' : 'إضافة الطالب'}</button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="اسم الطالب" required id="sf-n"><input id="sf-n" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="المرحلة الدراسية" required id="sf-g"><select id="sf-g" className="select" value={f.grade} onChange={(e) => set('grade', e.target.value)}>{GRADES.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="رسوم الساعة على الطالب" required id="sf-f" hint="منفصلة عن أجر المعلم"><input id="sf-f" type="number" min="1" className="input" value={f.fee} onChange={(e) => set('fee', e.target.value)} /></Field>
        <Field label="الجنس" id="sf-x"><select id="sf-x" className="select" value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="m">ذكر</option><option value="f">أنثى</option></select></Field>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between"><span className="label !mb-1">ولي الأمر <span className="text-bad-ink">*</span></span>
          <button type="button" className="text-sm font-bold text-navy underline" onClick={() => setNewParent(!newParent)}>{newParent ? 'اختيار ولي أمر موجود' : '+ ولي أمر جديد'}</button></div>
        {newParent ? (
          <div className="grid sm:grid-cols-3 gap-3">
            <input className="input" placeholder="اسم ولي الأمر" aria-label="اسم ولي الأمر" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
            <input className="input" dir="ltr" placeholder="الهاتف" aria-label="هاتف ولي الأمر" value={np.phone} onChange={(e) => setNp({ ...np, phone: e.target.value })} />
            <input className="input" dir="ltr" placeholder="البريد الإلكتروني" aria-label="بريد ولي الأمر" value={np.email} onChange={(e) => setNp({ ...np, email: e.target.value })} />
          </div>
        ) : (
          <select className="select" aria-label="ولي الأمر" value={f.parentId} onChange={(e) => set('parentId', e.target.value)}>
            <option value="">اختر ولي الأمر</option>
            {db.parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>
      <div className="mt-5">
        <span className="label">المواد والمعلمون المكلّفون <span className="text-bad-ink">*</span></span>
        <div className="flex flex-col gap-2">
          {f.assignments.map((a, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <select className="select flex-1 min-w-[150px]" aria-label="المادة" value={a.subjectId} onChange={(e) => setA(i, 'subjectId', e.target.value)}>
                <option value="">المادة</option>{db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="select flex-1 min-w-[150px]" aria-label="المعلم" value={a.teacherId} onChange={(e) => setA(i, 'teacherId', e.target.value)}>
                <option value="">المعلم</option>{db.teachers.filter((t) => !a.subjectId || t.subjects.includes(a.subjectId)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button type="button" className="btn btn-ghost btn-icon text-bad-ink" aria-label="حذف الصف" onClick={() => set('assignments', f.assignments.filter((_, j) => j !== i))} disabled={f.assignments.length === 1}><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => set('assignments', [...f.assignments, { subjectId: '', teacherId: '' }])}><Plus size={16} /> إضافة مادة</button>
      </div>
      <Field label="ملاحظات" className="mt-4" id="sf-no"><input id="sf-no" className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <Err>{err}</Err>
    </Modal>
  )
}

/* ---------------- Parent ---------------- */
export function ParentFormModal({ open, onClose, parent }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', relation: 'الأب' })
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setF(parent ? { ...parent } : { name: '', phone: '', email: '', relation: 'الأب' }); setErr('') } }, [open])
  const submit = () => {
    const r = parent ? run('updateParent', parent.id, f) : run('addParent', f)
    if (r.ok) { toast(parent ? 'تم تحديث بيانات ولي الأمر' : 'تمت إضافة ولي الأمر'); onClose() } else setErr(r.error)
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title={parent ? 'تعديل ولي الأمر' : 'إضافة ولي أمر'} footer={<><button className="btn btn-outline" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={submit}>حفظ</button></>}>
      <div className="grid gap-4">
        <Field label="الاسم" required id="pf-n"><input id="pf-n" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="صلة القرابة" id="pf-r"><select id="pf-r" className="select" value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}><option>الأب</option><option>الأم</option><option>وصي</option></select></Field>
        <Field label="الهاتف" id="pf-p"><input id="pf-p" className="input" dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="البريد الإلكتروني" id="pf-e"><input id="pf-e" className="input" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Err>{err}</Err>
      </div>
    </Modal>
  )
}

/* ---------------- Payment ---------------- */
export function PaymentModal({ open, onClose, db, type, refId: initialRef }) {
  const [refId, setRef] = useState(initialRef || '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState('نقدًا')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setRef(initialRef || ''); setAmount(''); setNote(''); setErr(''); setBusy(false); setDate(todayISO()) } }, [open, initialRef])
  const acc = accounts(db)
  const a = refId ? (type === 'student' ? acc.students : acc.teachers)[refId] : null
  const list = type === 'student' ? db.students : db.teachers
  const due = a?.balance ?? 0
  const entered = Number(amount) || 0
  const submit = () => {
    if (busy) return
    setBusy(true)
    const r = run('addPayment', { type, refId, amount, date, method, note })
    if (r.ok) { toast(`تم تسجيل الدفعة. الرصيد المتبقي: ${money(due - entered, db.settings)}`); onClose() } else { setErr(r.error); setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title={type === 'student' ? 'تسجيل دفعة من طالب' : 'تسجيل دفعة لمعلم'} footer={<><button className="btn btn-outline" onClick={onClose}>إلغاء</button><button className="btn btn-gold" onClick={submit} disabled={busy}>حفظ الدفعة</button></>}>
      <div className="grid gap-4">
        <Field label={type === 'student' ? 'الطالب' : 'المعلم'} required id="py-r">
          <select id="py-r" className="select" value={refId} onChange={(e) => { setRef(e.target.value); setErr('') }}>
            <option value="">اختر...</option>
            {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        {a && <div className="rounded-xl bg-mist p-3 text-sm grid grid-cols-2 gap-2"><span className="text-slate">{type === 'student' ? 'الرصيد المستحق' : 'المستحق للمعلم'}</span><b className="text-end">{money(due, db.settings)}</b><span className="text-slate">الرصيد بعد الدفعة</span><b className="text-end text-ok-ink">{money(Math.max(0, due - entered), db.settings)}</b></div>}
        <Field label={`المبلغ (${db.settings.currency === 'USD' ? 'دولار' : 'ج.م'})`} required id="py-a"><input id="py-a" type="number" min="1" className="input" value={amount} onChange={(e) => { setAmount(e.target.value); setErr('') }} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="تاريخ الدفع" required id="py-d"><input id="py-d" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="طريقة الدفع" required id="py-m"><select id="py-m" className="select" value={method} onChange={(e) => setMethod(e.target.value)}>{['نقدًا', 'تحويل بنكي', 'فودافون كاش', 'بطاقة بنكية'].map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <Field label="ملاحظة" id="py-n"><input id="py-n" className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Err>{err}</Err>
      </div>
    </Modal>
  )
}

/* ---------------- Homework / Report (teacher & admin) ---------------- */
function useStudentChoice(db, teacherId, open, studentId) {
  const students = teacherId ? teacherStudents(db, teacherId) : db.students
  const [sid, setSid] = useState(studentId || '')
  const [sub, setSub] = useState('')
  useEffect(() => { if (open) { setSid(studentId || ''); setSub('') } }, [open, studentId])
  const st = getStudent(db, sid)
  const subs = st ? st.assignments.filter((a) => !teacherId || a.teacherId === teacherId) : []
  return { students, sid, setSid, sub, setSub, st, subs }
}
export function HomeworkModal({ open, onClose, db, user, studentId }) {
  const tId = user.role === 'teacher' ? user.refId : null
  const c = useStudentChoice(db, tId, open, studentId)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(addDays(todayISO(), 3))
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setTitle(''); setErr(''); setDue(addDays(todayISO(), 3)) } }, [open])
  const submit = () => {
    const chosen = c.subs.find((a) => a.subjectId === c.sub) || c.subs[0]
    if (!chosen) return setErr('اختر الطالب والمادة')
    const r = run('addHomework', { studentId: c.sid, teacherId: chosen.teacherId, subjectId: chosen.subjectId, title, dueDate: due })
    if (r.ok) { toast('تمت إضافة الواجب وإشعار الطالب وولي الأمر'); onClose() } else setErr(r.error)
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title="إضافة واجب" footer={<><button className="btn btn-outline" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={submit}>حفظ الواجب</button></>}>
      <div className="grid gap-4">
        <StudentSubjectPick c={c} db={db} />
        <Field label="عنوان الواجب" required id="hw-t"><input id="hw-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: حل تمارين الدرس الثالث" /></Field>
        <Field label="موعد التسليم" required id="hw-d"><input id="hw-d" type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <Err>{err}</Err>
      </div>
    </Modal>
  )
}
export function ReportModal({ open, onClose, db, user, studentId }) {
  const tId = user.role === 'teacher' ? user.refId : null
  const c = useStudentChoice(db, tId, open, studentId)
  const [text, setText] = useState('')
  const [rating, setRating] = useState(4)
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setText(''); setErr(''); setRating(4) } }, [open])
  const submit = () => {
    const chosen = c.subs.find((a) => a.subjectId === c.sub) || c.subs[0]
    if (!chosen) return setErr('اختر الطالب والمادة')
    const r = run('addReport', { studentId: c.sid, teacherId: chosen.teacherId, subjectId: chosen.subjectId, text, rating })
    if (r.ok) { toast('تمت إضافة التقرير وإشعار الطالب وولي الأمر'); onClose() } else setErr(r.error)
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title="إضافة تقرير أداء" footer={<><button className="btn btn-outline" onClick={onClose}>إلغاء</button><button className="btn btn-primary" onClick={submit}>حفظ التقرير</button></>}>
      <div className="grid gap-4">
        <StudentSubjectPick c={c} db={db} />
        <Field label="مستوى الأداء" id="rp-r"><select id="rp-r" className="select" value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} {['', 'يحتاج دعمًا', 'مقبول', 'جيد', 'جيد جدًا', 'ممتاز'][n]}</option>)}</select></Field>
        <Field label="نص التقرير" required id="rp-t"><textarea id="rp-t" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="ملاحظات حول مستوى الطالب وتقدّمه..." /></Field>
        <Err>{err}</Err>
      </div>
    </Modal>
  )
}
function StudentSubjectPick({ c, db }) {
  return (
    <>
      <Field label="الطالب" required id="ss-s">
        <select id="ss-s" className="select" value={c.sid} onChange={(e) => { c.setSid(e.target.value); c.setSub('') }}>
          <option value="">اختر الطالب</option>{c.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="المادة" id="ss-m">
        <select id="ss-m" className="select" value={c.sub} onChange={(e) => c.setSub(e.target.value)} disabled={!c.st}>
          <option value="">{c.subs.length ? 'اختر المادة' : '—'}</option>{c.subs.map((a) => <option key={a.subjectId} value={a.subjectId}>{getSubject(db, a.subjectId).name}</option>)}
        </select>
      </Field>
    </>
  )
}

/* ---------------- quick attendance ---------------- */
export function AttendanceModal({ open, onClose, db, user }) {
  const today = todayISO()
  const mine = db.lessons.filter((l) => l.date === today && l.status !== 'cancelled' && (user.role !== 'teacher' || l.teacherId === user.refId)).sort(lessonSort)
  return (
    <Modal open={open} onClose={onClose} title="تسجيل حضور حصص اليوم">
      {!mine.length ? <p className="text-slate text-center py-6">لا توجد حصص اليوم.</p> : (
        <div className="flex flex-col gap-3">
          {mine.map((l) => (
            <div key={l.id} className="rounded-xl border border-hair p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0"><Avatar name={getStudent(db, l.studentId).name} size={36} /><div className="min-w-0"><div className="font-bold truncate">{getStudent(db, l.studentId).name}</div><div className="text-xs text-slate">{getSubject(db, l.subjectId).name} - {fmtTime(l.start)}</div></div></div>
                <StatusBadge status={l.status} />
              </div>
              <div className="flex gap-2">
                {Object.entries(ATTENDANCE).map(([k, v]) => (
                  <button key={k} onClick={() => { const r = run('markAttendance', l.id, k); r.ok && toast(`تم تسجيل ${v}: ${getStudent(db, l.studentId).name}`) }} className={`btn btn-sm flex-1 ${l.attendance === k ? (k === 'absent' ? 'btn-danger' : 'btn-primary') : 'btn-outline'}`}>{v}</button>
                ))}
              </div>
              {l.attendance && l.attendance !== 'absent' && l.status === 'upcoming' && <p className="text-xs text-slate mt-2">سجّل الحصة من صفحة «تسجيل الحصص» لاحتسابها.</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
