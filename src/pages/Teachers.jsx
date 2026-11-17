import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ArrowRight, Phone, Mail, Award, Clock, Wallet, Check } from 'lucide-react'
import { PageHeader, Card, SearchBox, Select, Avatar, Badge, Stat, Tabs, DataTable, Empty, Confirm, toast, money, num, StatusBadge, PayBadge } from '../components/ui'
import { TeacherFormModal, PaymentModal, run } from '../components/forms'
import { LessonCard, LessonDetail } from '../components/lesson'
import { accounts, teacherStudents, getStudent, getSubject, lessonSort } from '../lib/calc'
import { fmtDate, fmtTime, todayISO, DAY_NAMES, relativeDay, hoursLabel } from '../lib/dates'
import { go, Link } from '../lib/router'

export default function Teachers({ db, user, id }) {
  if (id) return <TeacherProfile db={db} id={id} />
  return <List db={db} />
}

function List({ db }) {
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [form, setForm] = useState(false)
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const acc = accounts(db).teachers
  const rows = useMemo(() => db.teachers.filter((t) => (!q || `${t.name} ${t.id}`.includes(q.trim())) && (!subject || t.subjects.includes(subject))), [db, q, subject])
  return (
    <div>
      <PageHeader title="المعلمون" sub={`${rows.length} من ${db.teachers.length} معلمًا`} actions={<button className="btn btn-primary" onClick={() => setForm(true)}><Plus size={16} /> إضافة معلم</button>} />
      <div className="grid sm:grid-cols-[1fr_16rem] gap-3 mb-6"><SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو رقم المعلم" /><Select value={subject} onChange={setSubject} placeholder="كل المواد" options={db.subjects.map((s) => ({ value: s.id, label: s.name }))} /></div>
      {rows.length ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map((t) => (
            <article key={t.id} className="card p-5 flex flex-col">
              <div className="flex items-start gap-4"><Avatar name={t.name} size={60} /><div className="min-w-0 flex-1"><h3 className="text-lg leading-tight">{t.name}</h3><div className="text-xs text-slate num">{t.id}</div><div className="flex flex-wrap gap-1 mt-2">{t.subjects.map((s) => <Badge key={s} tone="mist">{getSubject(db, s).name}</Badge>)}</div></div></div>
              <dl className="grid grid-cols-3 gap-2 text-center my-4 py-3 border-y border-hair">
                <div><dd className="font-extrabold num">{teacherStudents(db, t.id).length}</dd><dt className="text-xs text-slate">طلاب</dt></div>
                <div><dd className="font-extrabold num">{num(acc[t.id].hours)}</dd><dt className="text-xs text-slate">ساعة</dt></div>
                <div><dd className="font-extrabold num">{money(acc[t.id].balance, db.settings)}</dd><dt className="text-xs text-slate">مستحق</dt></div>
              </dl>
              <div className="flex gap-2 mt-auto">
                <button className="btn btn-primary btn-sm flex-1" onClick={() => go(`/app/teachers/${t.id}`)}>عرض الملف</button>
                <button className="btn btn-outline btn-icon btn-sm" aria-label={`تعديل ${t.name}`} onClick={() => setEdit(t)}><Pencil size={16} /></button>
                <button className="btn btn-outline btn-icon btn-sm text-bad-ink" aria-label={`حذف ${t.name}`} onClick={() => setDel(t)}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : <Empty title="لا يوجد معلمون مطابقون" />}
      <TeacherFormModal open={form || !!edit} onClose={() => { setForm(false); setEdit(null) }} db={db} teacher={edit} />
      <Confirm open={!!del} onClose={() => setDel(null)} title="حذف المعلم" text={`سيتم حذف ${del?.name} وحصصه وإزالته من طلابه. هل أنت متأكد؟`} onConfirm={() => { run('deleteTeacher', del.id); toast('تم حذف المعلم'); setDel(null) }} />
    </div>
  )
}

function TeacherProfile({ db, id }) {
  const t = db.teachers.find((x) => x.id === id)
  const [tab, setTab] = useState('info')
  const [edit, setEdit] = useState(false)
  const [del, setDel] = useState(false)
  const [pay, setPay] = useState(false)
  const [open, setOpen] = useState(null)
  if (!t) return <Empty title="المعلم غير موجود" action={<Link to="/app/teachers" className="btn btn-primary">العودة</Link>} />
  const a = accounts(db).teachers[t.id]
  const students = teacherStudents(db, t.id)
  const lessons = db.lessons.filter((l) => l.teacherId === t.id).sort(lessonSort)
  const today = todayISO()
  const up = lessons.filter((l) => l.status === 'upcoming' && l.date >= today)
  const done = lessons.filter((l) => l.status !== 'upcoming').reverse()
  const payments = db.payments.filter((p) => p.type === 'teacher' && p.refId === t.id).sort((x, y) => y.date.localeCompare(x.date))
  const weekly = {}
  up.slice(0, 40).forEach((l) => { const d = new Date(l.date + 'T12:00').getDay(); const k = `${DAY_NAMES[d]}|${l.start}|${l.studentId}|${l.subjectId}`; weekly[k] ||= l })
  const wk = Object.values(weekly).sort((x, y) => (x.start).localeCompare(y.start))
  return (
    <div>
      <PageHeader back={<Link to="/app/teachers" className="inline-flex items-center gap-1 text-sm font-bold text-navy mb-2"><ArrowRight size={16} /> العودة للمعلمين</Link>} title={t.name} sub={`${t.id} • ${t.subjects.map((s) => getSubject(db, s).name).join('، ')}`} actions={<><button className="btn btn-outline" onClick={() => setPay(true)}><Wallet size={16} /> تسجيل دفعة</button><button className="btn btn-outline" onClick={() => setEdit(true)}><Pencil size={16} /> تعديل</button><button className="btn btn-danger" onClick={() => setDel(true)}><Trash2 size={16} /> حذف</button></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat icon={Clock} label="ساعات مستحقة الدفع" value={`${num(a.hours)} س`} sub={`${money(t.rate, db.settings)} / ساعة`} />
        <Stat icon={Wallet} tone="gold" label="إجمالي المستحقات" value={money(a.earnings, db.settings)} />
        <Stat icon={Check} tone="ok" label="المدفوع" value={money(a.paid, db.settings)} />
        <Stat icon={Wallet} tone="bad" label="المتبقي" value={money(a.balance, db.settings)} sub={<PayBadge status={a.status} />} />
      </div>
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ id: 'info', label: 'نبذة' }, { id: 'students', label: `الطلاب (${students.length})` }, { id: 'schedule', label: 'الجدول' }, { id: 'lessons', label: 'الحصص المنفذة' }, { id: 'pay', label: 'الدفعات' }]} />
      {tab === 'info' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" title="السيرة المهنية"><p className="leading-loose">{t.bio}</p><div className="mt-4 flex items-start gap-2 text-navy font-semibold"><Award size={20} className="text-gold-ink shrink-0 mt-0.5" />{t.qualifications}</div></Card>
          <Card title="بيانات التواصل"><dl className="space-y-3 text-sm"><div className="flex gap-2"><Phone size={16} className="text-gold-ink mt-1" /><span dir="ltr">{t.phone}</span></div><div className="flex gap-2"><Mail size={16} className="text-gold-ink mt-1" /><span dir="ltr">{t.email}</span></div><div>الخبرة: <b>{t.experience} سنة</b></div><div>سعر الساعة المدفوع: <b className="num">{money(t.rate, db.settings)}</b></div></dl></Card>
        </div>
      )}
      {tab === 'students' && <Card>{students.length ? <ul className="grid md:grid-cols-2 gap-3">{students.map((s) => <li key={s.id}><Link to={`/app/students/${s.id}`} className="flex items-center gap-3 rounded-xl border border-hair p-3 hover:bg-mist"><Avatar name={s.name} size={40} /><span className="flex-1"><b className="block">{s.name}</b><span className="text-xs text-slate">{s.grade} • {s.assignments.filter((x) => x.teacherId === t.id).map((x) => getSubject(db, x.subjectId).name).join('، ')}</span></span></Link></li>)}</ul> : <Empty title="لا يوجد طلاب مسندون" />}</Card>}
      {tab === 'schedule' && <Card title="الجدول الأسبوعي المتكرر">{wk.length ? <DataTable rows={wk} rowKey={(l) => l.id} columns={[{ key: 'd', label: 'اليوم', render: (l) => DAY_NAMES[new Date(l.date + 'T12:00').getDay()] }, { key: 't', label: 'الوقت', render: (l) => <span className="num">{fmtTime(l.start)} - {fmtTime(l.end)}</span> }, { key: 's', label: 'الطالب', render: (l) => getStudent(db, l.studentId)?.name }, { key: 'm', label: 'المادة', render: (l) => getSubject(db, l.subjectId)?.name }]} /> : <Empty title="لا توجد حصص قادمة" />}</Card>}
      {tab === 'lessons' && <Card><DataTable rows={done.slice(0, 60)} onRowClick={setOpen} columns={[{ key: 'd', label: 'التاريخ', render: (l) => fmtDate(l.date) }, { key: 's', label: 'الطالب', render: (l) => getStudent(db, l.studentId)?.name }, { key: 'm', label: 'المادة', render: (l) => getSubject(db, l.subjectId)?.name }, { key: 'h', label: 'المدة', render: (l) => hoursLabel(l.actualMinutes ?? 0) }, { key: 'st', label: 'الحالة', render: (l) => <StatusBadge status={l.status} /> }]} empty={{ title: 'لا توجد حصص منفذة' }} /></Card>}
      {tab === 'pay' && <Card title="الدفعات المسددة للمعلم">{payments.length ? <DataTable rows={payments} columns={[{ key: 'd', label: 'التاريخ', render: (p) => fmtDate(p.date) }, { key: 'a', label: 'المبلغ', render: (p) => <b className="num">{money(p.amount, db.settings)}</b> }, { key: 'm', label: 'الطريقة' }, { key: 'n', label: 'ملاحظة', render: (p) => p.note || '-' }]} /> : <Empty title="لا توجد دفعات" />}</Card>}
      {open && <LessonDetail l={open} db={db} onClose={() => setOpen(null)} />}
      <TeacherFormModal open={edit} onClose={() => setEdit(false)} db={db} teacher={t} />
      <PaymentModal open={pay} onClose={() => setPay(false)} db={db} type="teacher" refId={t.id} />
      <Confirm open={del} onClose={() => setDel(false)} title="حذف المعلم" text={`سيتم حذف ${t.name} وحصصه. هل أنت متأكد؟`} onConfirm={() => { run('deleteTeacher', t.id); toast('تم حذف المعلم'); go('/app/teachers') }} />
    </div>
  )
}
