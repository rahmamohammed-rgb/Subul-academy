import { useMemo, useState } from 'react'
import { Plus, Download, Wallet, Check, CircleDollarSign, Clock, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { PageHeader, Card, Tabs, Stat, DataTable, SearchBox, Select, PayBadge, Notice, Confirm, toast, money, num, downloadCSV, Empty } from '../components/ui'
import { PaymentModal, run } from '../components/forms'
import { accounts, totals, getStudent, getTeacher } from '../lib/calc'
import { monthlyFinance } from '../lib/stats'
import { fmtDate, fmtMonth, todayISO } from '../lib/dates'
import { Link } from '../lib/router'

function RateInput({ value, onSave, label }) {
  const [v, setV] = useState(String(value))
  const dirty = Number(v) !== value
  const submit = () => { const r = onSave(Number(v)); if (r?.ok === false) setV(String(value)); else toast('تم تحديث السعر') }
  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input aria-label={label} type="number" min="1" className="input !min-h-0 !py-1 !px-2 w-24 num text-center" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
      {dirty && <button className="btn btn-primary btn-sm !px-2" onClick={submit} aria-label="حفظ السعر"><Check size={15} /></button>}
    </span>
  )
}

export default function Finance({ db }) {
  const [tab, setTab] = useState('summary')
  const [pay, setPay] = useState(null)
  const [del, setDel] = useState(null)
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [pf, setPf] = useState({ type: '', method: '', from: '', to: '' })
  const acc = accounts(db)
  const t = totals(db)
  const cur = db.settings
  const fin = monthlyFinance(db, 6)
  const sRows = db.students.filter((s) => (!q || s.name.includes(q.trim())) && (!st || acc.students[s.id].status === st)).map((s) => ({ ...s, a: acc.students[s.id] }))
  const tRows = db.teachers.filter((x) => (!q || x.name.includes(q.trim())) && (!st || acc.teachers[x.id].status === st)).map((x) => ({ ...x, a: acc.teachers[x.id] }))
  const payments = useMemo(() => db.payments.filter((p) => (!pf.type || p.type === pf.type) && (!pf.method || p.method === pf.method) && (!pf.from || p.date >= pf.from) && (!pf.to || p.date <= pf.to)).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)), [db, pf])
  const methods = [...new Set(db.payments.map((p) => p.method))]
  const nm = (p) => (p.type === 'student' ? getStudent(db, p.refId)?.name : getTeacher(db, p.refId)?.name)
  const statusOpts = [{ value: 'paid', label: 'مدفوع' }, { value: 'partial', label: 'مدفوع جزئيًا' }, { value: 'unpaid', label: 'غير مدفوع' }]
  const M = (n) => money(n, cur)

  const sCols = [
    { key: 'name', label: 'الطالب', render: (r) => <Link to={`/app/students/${r.id}`} className="font-bold text-navy hover:underline">{r.name}</Link>, csv: (r) => r.name },
    { key: 'fee', label: `سعر الساعة`, render: (r) => <RateInput label={`سعر ساعة ${r.name}`} value={r.fee} onSave={(v) => run('updateStudent', r.id, { fee: v })} />, csv: (r) => r.fee },
    { key: 'h', label: 'الساعات المحتسبة', render: (r) => <span className="num">{num(r.a.hours)}</span>, csv: (r) => num(r.a.hours, 2) },
    { key: 'c', label: 'إجمالي الرسوم', render: (r) => <span className="num">{M(r.a.charges)}</span>, csv: (r) => r.a.charges },
    { key: 'p', label: 'المدفوع', render: (r) => <span className="num">{M(r.a.paid)}</span>, csv: (r) => r.a.paid },
    { key: 'b', label: 'المتبقي', render: (r) => <b className="num">{M(r.a.balance)}</b>, csv: (r) => r.a.balance },
    { key: 's', label: 'الحالة', render: (r) => <PayBadge status={r.a.status} />, csv: (r) => r.a.status },
    { key: 'x', label: '', csv: () => '', render: (r) => <button className="btn btn-outline btn-sm" disabled={r.a.balance <= 0} onClick={() => setPay({ type: 'student', refId: r.id })}>تسجيل دفعة</button> },
  ]
  const tCols = [
    { key: 'name', label: 'المعلم', render: (r) => <Link to={`/app/teachers/${r.id}`} className="font-bold text-navy hover:underline">{r.name}</Link>, csv: (r) => r.name },
    { key: 'rate', label: 'أجر الساعة', render: (r) => <RateInput label={`أجر ساعة ${r.name}`} value={r.rate} onSave={(v) => run('updateTeacher', r.id, { rate: v })} />, csv: (r) => r.rate },
    { key: 'h', label: 'الساعات المستحقة', render: (r) => <span className="num">{num(r.a.hours)}</span>, csv: (r) => num(r.a.hours, 2) },
    { key: 'e', label: 'إجمالي المستحقات', render: (r) => <span className="num">{M(r.a.earnings)}</span>, csv: (r) => r.a.earnings },
    { key: 'p', label: 'المدفوع', render: (r) => <span className="num">{M(r.a.paid)}</span>, csv: (r) => r.a.paid },
    { key: 'b', label: 'المتبقي', render: (r) => <b className="num">{M(r.a.balance)}</b>, csv: (r) => r.a.balance },
    { key: 's', label: 'الحالة', render: (r) => <PayBadge status={r.a.status} />, csv: (r) => r.a.status },
    { key: 'x', label: '', csv: () => '', render: (r) => <button className="btn btn-outline btn-sm" disabled={r.a.balance <= 0} onClick={() => setPay({ type: 'teacher', refId: r.id })}>دفع للمعلم</button> },
  ]
  const pCols = [
    { key: 'd', label: 'التاريخ', render: (p) => fmtDate(p.date), csv: (p) => p.date },
    { key: 't', label: 'النوع', render: (p) => (p.type === 'student' ? 'من طالب' : 'إلى معلم'), csv: (p) => (p.type === 'student' ? 'من طالب' : 'إلى معلم') },
    { key: 'n', label: 'الاسم', render: nm, csv: nm },
    { key: 'a', label: 'المبلغ', render: (p) => <b className="num">{M(p.amount)}</b>, csv: (p) => p.amount },
    { key: 'm', label: 'الطريقة' },
    { key: 'note', label: 'ملاحظة', render: (p) => p.note || '-', csv: (p) => p.note },
    { key: 'x', label: '', csv: () => '', render: (p) => <button className="btn btn-ghost btn-icon btn-sm text-bad-ink" aria-label="حذف الدفعة" onClick={() => setDel(p)}><Trash2 size={16} /></button> },
  ]
  const filters = (
    <div className="grid sm:grid-cols-[1fr_14rem] gap-3 mb-4"><SearchBox value={q} onChange={setQ} placeholder="بحث بالاسم" /><Select value={st} onChange={setSt} placeholder="كل الحالات" options={statusOpts} /></div>
  )
  const exportBtn = (name, cols, rows) => <button className="btn btn-outline btn-sm" onClick={() => downloadCSV(name, cols.filter((c) => c.label), rows)}><Download size={15} /> تصدير CSV</button>

  return (
    <div>
      <PageHeader title="المستحقات المالية" sub={`جميع المبالغ بـ ${cur.currency === 'EGP' ? 'الجنيه المصري (EGP)' : 'الدولار الأمريكي (USD)'}`} actions={<><button className="btn btn-outline" onClick={() => setPay({ type: 'teacher' })}><Plus size={16} /> دفعة لمعلم</button><button className="btn btn-primary" onClick={() => setPay({ type: 'student' })}><Plus size={16} /> دفعة من طالب</button></>} />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ id: 'summary', label: 'الملخص الشهري' }, { id: 'students', label: 'رسوم الطلاب' }, { id: 'teachers', label: 'مستحقات المعلمين' }, { id: 'payments', label: 'سجل المدفوعات' }, { id: 'outstanding', label: 'الأرصدة المتبقية' }]} />

      {tab === 'summary' && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <Stat icon={Wallet} label="إجمالي رسوم الطلاب" value={M(t.studentCharges)} sub={`${num(t.studentHours)} ساعة`} />
            <Stat icon={Check} tone="ok" label="المقبوض من الطلاب" value={M(t.studentPaid)} />
            <Stat icon={CircleDollarSign} tone="bad" label="المتبقي على الطلاب" value={M(t.studentBalance)} />
            <Stat icon={Clock} tone="gold" label="مستحقات المعلمين المتبقية" value={M(t.teacherBalance)} sub={`إجمالي ${M(t.teacherEarnings)}`} />
          </div>
          <Notice tone="info" className="mb-6">هامش الأكاديمية التقديري = رسوم الطلاب − مستحقات المعلمين = <b className="num">{M(t.studentCharges - t.teacherEarnings)}</b></Notice>
          <Card title="الرسوم والمستحقات شهريًا" className="mb-6">
            <div dir="ltr" className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={fin} margin={{ left: 0, right: 4 }}><CartesianGrid stroke="#e3eaf2" vertical={false} /><XAxis dataKey="month" reversed tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ fontFamily: 'Cairo', direction: 'rtl', borderRadius: 12 }} formatter={(v) => v.toLocaleString('en-US')} /><Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} /><Bar dataKey="charges" name="رسوم الطلاب" fill="#12385B" radius={[4, 4, 0, 0]} /><Bar dataKey="received" name="المقبوض" fill="#23966A" radius={[4, 4, 0, 0]} /><Bar dataKey="earnings" name="مستحقات المعلمين" fill="#D8A642" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </Card>
          <Card title="جدول الملخص الشهري" action={exportBtn('monthly-finance.csv', [{ key: 'month', label: 'الشهر', csv: (r) => r.key }, { key: 'charges', label: 'رسوم الطلاب' }, { key: 'received', label: 'المقبوض' }, { key: 'earnings', label: 'مستحقات المعلمين' }], fin)}>
            <DataTable rows={[...fin].reverse()} rowKey={(r) => r.key} columns={[{ key: 'm', label: 'الشهر', render: (r) => fmtMonth(r.key) }, { key: 'c', label: 'رسوم الطلاب', render: (r) => <span className="num">{M(r.charges)}</span> }, { key: 'r', label: 'المقبوض', render: (r) => <span className="num">{M(r.received)}</span> }, { key: 'e', label: 'مستحقات المعلمين', render: (r) => <span className="num">{M(r.earnings)}</span> }, { key: 'n', label: 'الصافي التقديري', render: (r) => <b className="num">{M(r.charges - r.earnings)}</b> }]} />
          </Card>
        </>
      )}

      {tab === 'students' && <Card title="حسابات الطلاب" action={exportBtn('student-fees.csv', sCols, sRows)}>{filters}<Notice tone="info" className="mb-4">الرسوم = الساعات المحتسبة × سعر ساعة الطالب. المتبقي = الرسوم − المدفوعات. عدّل سعر الساعة مباشرة من الجدول.</Notice><DataTable rows={sRows} columns={sCols} /></Card>}
      {tab === 'teachers' && <Card title="حسابات المعلمين" action={exportBtn('teacher-earnings.csv', tCols, tRows)}>{filters}<Notice tone="info" className="mb-4">المستحقات = الساعات المستحقة × أجر ساعة المعلم (منفصل عن رسوم الطلاب). المتبقي = المستحقات − الدفعات.</Notice><DataTable rows={tRows} columns={tCols} /></Card>}
      {tab === 'payments' && (
        <Card title="سجل المدفوعات" action={exportBtn('payments.csv', pCols, payments)}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Select value={pf.type} onChange={(v) => setPf({ ...pf, type: v })} placeholder="كل الأنواع" options={[{ value: 'student', label: 'من طالب' }, { value: 'teacher', label: 'إلى معلم' }]} />
            <Select value={pf.method} onChange={(v) => setPf({ ...pf, method: v })} placeholder="كل الطرق" options={methods.map((m) => ({ value: m, label: m }))} />
            <input type="date" className="input" aria-label="من تاريخ" value={pf.from} onChange={(e) => setPf({ ...pf, from: e.target.value })} />
            <input type="date" className="input" aria-label="إلى تاريخ" value={pf.to} onChange={(e) => setPf({ ...pf, to: e.target.value })} />
          </div>
          <DataTable rows={payments} columns={pCols} empty={{ title: 'لا توجد مدفوعات' }} />
        </Card>
      )}
      {tab === 'outstanding' && (
        <div className="grid xl:grid-cols-2 gap-6">
          <Card title="طلاب عليهم أرصدة متبقية" action={exportBtn('outstanding-students.csv', sCols, sRows.filter((r) => r.a.balance > 0))}>
            {(() => { const rows = sRows.filter((r) => r.a.balance > 0).sort((a, b) => b.a.balance - a.a.balance); return rows.length ? <ul className="divide-y divide-hair">{rows.map((r) => <li key={r.id} className="py-2.5 flex items-center justify-between gap-3"><Link to={`/app/students/${r.id}`} className="font-bold hover:underline">{r.name}</Link><span className="flex items-center gap-2"><b className="num text-bad-ink">{M(r.a.balance)}</b><PayBadge status={r.a.status} /></span></li>)}</ul> : <Empty title="لا توجد أرصدة متبقية" /> })()}
          </Card>
          <Card title="مستحقات معلمين متبقية" action={exportBtn('outstanding-teachers.csv', tCols, tRows.filter((r) => r.a.balance > 0))}>
            {(() => { const rows = tRows.filter((r) => r.a.balance > 0).sort((a, b) => b.a.balance - a.a.balance); return rows.length ? <ul className="divide-y divide-hair">{rows.map((r) => <li key={r.id} className="py-2.5 flex items-center justify-between gap-3"><Link to={`/app/teachers/${r.id}`} className="font-bold hover:underline">{r.name}</Link><b className="num">{M(r.a.balance)}</b></li>)}</ul> : <Empty title="لا توجد مستحقات متبقية" /> })()}
          </Card>
        </div>
      )}

      {pay && <PaymentModal open onClose={() => setPay(null)} db={db} type={pay.type || 'student'} refId={pay.refId} />}
      <Confirm open={!!del} onClose={() => setDel(null)} title="حذف الدفعة" text="سيعاد احتساب الرصيد المتبقي بعد حذف هذه الدفعة. هل أنت متأكد؟" onConfirm={() => { run('deletePayment', del.id); toast('تم حذف الدفعة'); setDel(null) }} />
    </div>
  )
}
