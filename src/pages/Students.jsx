import { useMemo, useState } from 'react'
import { Plus, Eye, Pencil, Trash2, Download } from 'lucide-react'
import { PageHeader, Card, SearchBox, Select, DataTable, Avatar, Badge, PayBadge, Confirm, toast, money, downloadCSV, Empty } from '../components/ui'
import { StudentFormModal, run } from '../components/forms'
import { accounts, getParent, getTeacher, teacherStudents } from '../lib/calc'
import { GRADES } from '../lib/seed'
import { go } from '../lib/router'

export default function Students({ db, user }) {
  const isAdmin = user.role === 'admin'
  const [q, setQ] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [teacher, setTeacher] = useState('')
  const [pay, setPay] = useState('')
  const [form, setForm] = useState(false)
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const acc = accounts(db).students
  const base = isAdmin ? db.students : teacherStudents(db, user.refId)
  const rows = useMemo(() => base.filter((s) => {
    if (q && !`${s.name} ${s.id}`.includes(q.trim())) return false
    if (grade && s.grade !== grade) return false
    if (subject && !s.assignments.some((a) => a.subjectId === subject)) return false
    if (teacher && !s.assignments.some((a) => a.teacherId === teacher)) return false
    if (pay && acc[s.id].status !== pay) return false
    return true
  }), [db, q, grade, subject, teacher, pay])
  const cols = [
    { key: 'name', label: 'الطالب', render: (s) => <span className="flex items-center gap-3"><Avatar name={s.name} size={36} /><span><span className="block font-bold text-navy-deep">{s.name}</span><span className="block text-xs text-slate num">{s.id}</span></span></span>, csv: (s) => s.name },
    { key: 'grade', label: 'المرحلة' },
    { key: 'subjects', label: 'المواد', render: (s) => <span className="flex flex-wrap gap-1 justify-end md:justify-start">{s.assignments.filter((a) => isAdmin || a.teacherId === user.refId).map((a) => <Badge key={a.subjectId} tone="mist">{db.subjects.find((x) => x.id === a.subjectId).name}</Badge>)}</span>, csv: (s) => s.assignments.map((a) => db.subjects.find((x) => x.id === a.subjectId).name).join(' - ') },
    ...(isAdmin ? [
      { key: 'parent', label: 'ولي الأمر', render: (s) => getParent(db, s.parentId)?.name, csv: (s) => getParent(db, s.parentId)?.name },
      { key: 'fee', label: 'سعر الساعة', render: (s) => <span className="num">{money(s.fee, db.settings)}</span>, csv: (s) => s.fee },
      { key: 'balance', label: 'المتبقي', render: (s) => <span className="flex items-center gap-2 justify-end md:justify-start"><b className="num">{money(acc[s.id].balance, db.settings)}</b><PayBadge status={acc[s.id].status} /></span>, csv: (s) => acc[s.id].balance },
    ] : []),
    { key: 'act', label: 'إجراءات', csv: () => '', render: (s) => (
      <span className="flex gap-1 justify-end md:justify-start" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon btn-sm" aria-label={`عرض ${s.name}`} onClick={() => go(`/app/students/${s.id}`)}><Eye size={17} /></button>
        {isAdmin && <button className="btn btn-ghost btn-icon btn-sm" aria-label={`تعديل ${s.name}`} onClick={() => setEdit(s)}><Pencil size={17} /></button>}
        {isAdmin && <button className="btn btn-ghost btn-icon btn-sm text-bad-ink" aria-label={`حذف ${s.name}`} onClick={() => setDel(s)}><Trash2 size={17} /></button>}
      </span>) },
  ]
  return (
    <div>
      <PageHeader title={isAdmin ? 'الطلاب' : 'طلابي'} sub={`${rows.length} من ${base.length} طالبًا`} actions={<>
        {isAdmin && <button className="btn btn-outline" onClick={() => downloadCSV('students.csv', cols.filter((c) => c.key !== 'act'), rows)}><Download size={16} /> تصدير CSV</button>}
        {isAdmin && <button className="btn btn-primary" onClick={() => setForm(true)}><Plus size={16} /> إضافة طالب</button>}
      </>} />
      <Card>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <div className="lg:col-span-2"><SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو رقم الطالب" /></div>
          <Select value={grade} onChange={setGrade} placeholder="كل المراحل" options={GRADES.map((g) => ({ value: g, label: g }))} />
          <Select value={subject} onChange={setSubject} placeholder="كل المواد" options={db.subjects.map((s) => ({ value: s.id, label: s.name }))} />
          {isAdmin ? <Select value={pay} onChange={setPay} placeholder="كل حالات السداد" options={[{ value: 'paid', label: 'مدفوع' }, { value: 'partial', label: 'مدفوع جزئيًا' }, { value: 'unpaid', label: 'غير مدفوع' }]} /> : <span />}
        </div>
        {isAdmin && <div className="mb-4 max-w-xs"><Select value={teacher} onChange={setTeacher} placeholder="كل المعلمين" options={db.teachers.map((t) => ({ value: t.id, label: t.name }))} /></div>}
        <DataTable rows={rows} columns={cols} onRowClick={(s) => go(`/app/students/${s.id}`)} empty={{ title: 'لا يوجد طلاب مطابقون' }} />
      </Card>
      <StudentFormModal open={form || !!edit} onClose={() => { setForm(false); setEdit(null) }} db={db} student={edit} onSaved={(id) => !edit && go(`/app/students/${id}`)} />
      <Confirm open={!!del} onClose={() => setDel(null)} title="حذف الطالب" text={`سيتم حذف ${del?.name} وكل سجلاته نهائيًا. هل أنت متأكد؟`} onConfirm={() => { run('deleteStudent', del.id); toast('تم حذف الطالب'); setDel(null) }} />
    </div>
  )
}
