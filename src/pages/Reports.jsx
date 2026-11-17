import { useMemo, useState } from 'react'
import { Printer, Download } from 'lucide-react'
import { PageHeader, Card, Select, Stat, DataTable, Empty, PayBadge, downloadCSV, money, num, Field, StatusBadge, LESSON_STATUS } from '../components/ui'
import { accounts, billableMinutes, payableMinutes, getStudent, getTeacher, getSubject, attendanceStats, subjectScores, overallAvg, round2, lessonMinutes, lessonSort } from '../lib/calc'
import { todayISO, addDays, weekStart, monthKey, fmtDate, fmtMonth, hoursLabel } from '../lib/dates'

const REPORTS = [['daily', 'التقرير اليومي'], ['weekly', 'ساعات التدريس الأسبوعية'], ['monthly', 'الملخص الشهري للحصص'], ['teachers', 'نشاط المعلمين'], ['attendance', 'حضور الطلاب'], ['progress', 'التقدم الدراسي'], ['finance', 'الملخص المالي'], ['outstanding', 'الأرصدة المتبقية']]

export default function Reports({ db }) {
  const today = todayISO()
  const [kind, setKind] = useState('daily')
  const [day, setDay] = useState(today)
  const [f, setF] = useState({ from: addDays(today, -30), to: today, teacher: '', student: '', subject: '', status: '' })
  const s = db.settings
  const M = (n) => money(n, s)
  const acc = accounts(db)
  const fee = (l) => round2((billableMinutes(l, s) / 60) * (getStudent(db, l.studentId)?.fee || 0))
  const earn = (l) => round2((payableMinutes(l, s) / 60) * (getTeacher(db, l.teacherId)?.rate || 0))
  const hrs = (l) => ((l.actualMinutes ?? lessonMinutes(l)) / 60)
  const from = kind === 'daily' ? day : f.from
  const to = kind === 'daily' ? day : f.to
  const L = useMemo(() => db.lessons.filter((l) => l.date >= from && l.date <= to && (!f.teacher || l.teacherId === f.teacher) && (!f.student || l.studentId === f.student) && (!f.subject || l.subjectId === f.subject) && (!f.status || l.status === f.status)).sort(lessonSort), [db, from, to, f])
  const done = L.filter((l) => l.status === 'completed')
  const sum = (arr, fn) => round2(arr.reduce((t, x) => t + fn(x), 0))
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  let cards = null, cols = [], rows = [], file = 'report.csv', note = null
  const lessonCols = [
    { key: 'd', label: 'التاريخ', render: (l) => fmtDate(l.date), csv: (l) => l.date },
    { key: 't', label: 'المعلم', render: (l) => getTeacher(db, l.teacherId)?.name, csv: (l) => getTeacher(db, l.teacherId)?.name },
    { key: 's', label: 'الطالب', render: (l) => getStudent(db, l.studentId)?.name, csv: (l) => getStudent(db, l.studentId)?.name },
    { key: 'm', label: 'المادة', render: (l) => getSubject(db, l.subjectId)?.name, csv: (l) => getSubject(db, l.subjectId)?.name },
    { key: 'h', label: 'الساعات', render: (l) => <span className="num">{num(l.status === 'completed' ? hrs(l) : 0, 2)}</span>, csv: (l) => (l.status === 'completed' ? hrs(l).toFixed(2) : 0) },
    { key: 'st', label: 'الحالة', render: (l) => <StatusBadge status={l.status} />, csv: (l) => LESSON_STATUS[l.status].label },
    { key: 'c', label: 'رسوم الطالب', render: (l) => <span className="num">{M(fee(l))}</span>, csv: (l) => fee(l) },
    { key: 'e', label: 'مستحق المعلم', render: (l) => <span className="num">{M(earn(l))}</span>, csv: (l) => earn(l) },
  ]
  const group = (keyFn) => { const m = new Map(); L.forEach((l) => { const k = keyFn(l); if (!m.has(k)) m.set(k, []); m.get(k).push(l) }); return [...m.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))) }
  const num2 = (k, label, fn) => ({ key: k, label, render: (r) => <span className="num">{fn(r)}</span>, csv: (r) => fn(r) })

  if (kind === 'daily') {
    const pays = db.payments.filter((p) => p.date === day)
    cards = [['حصص مكتملة', done.length], ['حصص ملغاة', L.filter((l) => l.status === 'cancelled').length], ['غياب الطلاب', L.filter((l) => l.status === 'absent').length], ['ساعات التدريس', `${num(sum(done, hrs), 2)} س`], ['ساعات محتسبة', `${num(sum(L, (l) => billableMinutes(l, s) / 60), 2)} س`], ['رسوم الطلاب', M(sum(L, fee))], ['مستحقات المعلمين', M(sum(L, earn))], ['المدفوعات المسجلة', M(sum(pays, (p) => p.amount))]]
    cols = lessonCols; rows = L; file = `daily-${day}.csv`
  } else if (kind === 'weekly') {
    const g = group((l) => weekStart(l.date)).map(([w, ls]) => ({ id: w, w, n: ls.filter((l) => l.status === 'completed').length, h: sum(ls.filter((l) => l.status === 'completed'), hrs), b: sum(ls, (l) => billableMinutes(l, s) / 60), p: sum(ls, (l) => payableMinutes(l, s) / 60) }))
    cols = [{ key: 'w', label: 'الأسبوع (يبدأ السبت)', render: (r) => fmtDate(r.w), csv: (r) => r.w }, num2('n', 'حصص مكتملة', (r) => r.n), num2('h', 'ساعات التدريس', (r) => num(r.h, 2)), num2('b', 'ساعات محتسبة للطلاب', (r) => num(r.b, 2)), num2('p', 'ساعات مستحقة للمعلمين', (r) => num(r.p, 2))]
    rows = g; file = 'weekly-hours.csv'
  } else if (kind === 'monthly') {
    rows = group((l) => monthKey(l.date)).map(([m, ls]) => ({ id: m, m, done: ls.filter((l) => l.status === 'completed').length, can: ls.filter((l) => l.status === 'cancelled').length, abs: ls.filter((l) => l.status === 'absent').length, up: ls.filter((l) => l.status === 'upcoming').length, h: sum(ls.filter((l) => l.status === 'completed'), hrs), c: sum(ls, fee), e: sum(ls, earn) }))
    cols = [{ key: 'm', label: 'الشهر', render: (r) => fmtMonth(r.m), csv: (r) => r.m }, num2('done', 'مكتملة', (r) => r.done), num2('up', 'قادمة', (r) => r.up), num2('can', 'ملغاة', (r) => r.can), num2('abs', 'غياب', (r) => r.abs), num2('h', 'الساعات', (r) => num(r.h, 2)), num2('c', 'رسوم الطلاب', (r) => M(r.c)), num2('e', 'مستحقات المعلمين', (r) => M(r.e))]
    file = 'monthly-summary.csv'
  } else if (kind === 'teachers') {
    rows = group((l) => l.teacherId).map(([id, ls]) => ({ id, name: getTeacher(db, id)?.name, done: ls.filter((l) => l.status === 'completed').length, can: ls.filter((l) => l.status === 'cancelled').length, abs: ls.filter((l) => l.status === 'absent').length, students: new Set(ls.map((l) => l.studentId)).size, h: sum(ls.filter((l) => l.status === 'completed'), hrs), e: sum(ls, earn) }))
    cols = [{ key: 'name', label: 'المعلم' }, num2('done', 'مكتملة', (r) => r.done), num2('can', 'ملغاة', (r) => r.can), num2('abs', 'غياب طلاب', (r) => r.abs), num2('students', 'عدد الطلاب', (r) => r.students), num2('h', 'الساعات', (r) => num(r.h, 2)), num2('e', 'المستحقات', (r) => M(r.e))]
    file = 'teacher-activity.csv'
  } else if (kind === 'attendance') {
    rows = group((l) => l.studentId).map(([id, ls]) => ({ id, name: getStudent(db, id)?.name, ...attendanceStats(ls) })).filter((r) => r.total > 0)
    cols = [{ key: 'name', label: 'الطالب' }, num2('total', 'حصص مسجلة', (r) => r.total), num2('present', 'حضور', (r) => r.present), num2('late', 'تأخر', (r) => r.late), num2('absent', 'غياب', (r) => r.absent), { key: 'rate', label: 'نسبة الحضور', render: (r) => <b className={`num ${r.rate < 80 ? 'text-bad-ink' : 'text-ok-ink'}`}>{r.rate}%</b>, csv: (r) => `${r.rate}%` }]
    file = 'attendance.csv'
  } else if (kind === 'progress') {
    rows = db.students.filter((st) => !f.student || st.id === f.student).map((st) => { const sc = subjectScores(db, st.id).filter((x) => !f.subject || x.subjectId === f.subject); return { id: st.id, name: st.name, grade: st.grade, avg: overallAvg(sc), n: sc.reduce((t, x) => t + x.list.length, 0), best: sc.sort((a, b) => b.avg - a.avg)[0], weak: sc.sort((a, b) => a.avg - b.avg)[0] } }).filter((r) => r.n > 0)
    cols = [{ key: 'name', label: 'الطالب' }, { key: 'grade', label: 'المرحلة' }, num2('n', 'عدد التقييمات', (r) => r.n), { key: 'avg', label: 'المعدل', render: (r) => <b className="num">{r.avg}%</b>, csv: (r) => `${r.avg}%` }, { key: 'best', label: 'الأقوى', render: (r) => getSubject(db, r.best.subjectId).name, csv: (r) => getSubject(db, r.best.subjectId).name }, { key: 'weak', label: 'يحتاج دعمًا', render: (r) => getSubject(db, r.weak.subjectId).name, csv: (r) => getSubject(db, r.weak.subjectId).name }]
    file = 'academic-progress.csv'; note = 'التقدم الدراسي يعتمد على التقييمات المسجلة ولا يتأثر بنطاق التاريخ.'
  } else if (kind === 'finance') {
    const pays = db.payments.filter((p) => p.date >= from && p.date <= to)
    cards = [['رسوم الطلاب (الفترة)', M(sum(L, fee))], ['مستحقات المعلمين (الفترة)', M(sum(L, earn))], ['المقبوض من الطلاب', M(sum(pays.filter((p) => p.type === 'student'), (p) => p.amount))], ['المدفوع للمعلمين', M(sum(pays.filter((p) => p.type === 'teacher'), (p) => p.amount))], ['صافي تقديري (رسوم − مستحقات)', M(sum(L, fee) - sum(L, earn))]]
    rows = group((l) => l.studentId).map(([id, ls]) => ({ id, name: getStudent(db, id)?.name, h: sum(ls, (l) => billableMinutes(l, s) / 60), c: sum(ls, fee), e: sum(ls, earn) })).filter((r) => r.c > 0 || r.e > 0)
    cols = [{ key: 'name', label: 'الطالب' }, num2('h', 'ساعات محتسبة', (r) => num(r.h, 2)), num2('c', 'رسوم الفترة', (r) => M(r.c)), num2('e', 'مستحقات المعلمين المرتبطة', (r) => M(r.e))]
    file = 'financial-summary.csv'
  } else {
    rows = db.students.filter((st) => !f.student || st.id === f.student).map((st) => ({ id: st.id, name: st.name, ...acc.students[st.id] })).filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance)
    cols = [{ key: 'name', label: 'الطالب' }, num2('charges', 'إجمالي الرسوم', (r) => M(r.charges)), num2('paid', 'المدفوع', (r) => M(r.paid)), num2('balance', 'المتبقي', (r) => M(r.balance)), { key: 'status', label: 'الحالة', render: (r) => <PayBadge status={r.status} />, csv: (r) => r.status }]
    file = 'outstanding-balances.csv'; note = 'الأرصدة تراكمية حتى اليوم ولا تتأثر بنطاق التاريخ.'
  }
  const showRange = kind !== 'daily' && !['progress', 'outstanding'].includes(kind)
  const csvCols = cols.filter((c) => c.label)

  return (
    <div>
      <PageHeader title="التقارير" sub="تُحسب جميع الأرقام من السجلات المحفوظة وبنفس قواعد الفوترة الحالية" actions={<>
        <button className="btn btn-outline" onClick={() => window.print()}><Printer size={16} /> طباعة</button>
        <button className="btn btn-primary" disabled={!rows.length} onClick={() => downloadCSV(file, csvCols, rows)}><Download size={16} /> تصدير CSV</button>
      </>} />
      <div role="tablist" className="flex flex-wrap gap-2 mb-5 no-print">{REPORTS.map(([id, l]) => <button key={id} role="tab" aria-selected={kind === id} onClick={() => setKind(id)} className={`rounded-full px-4 py-2 text-sm font-bold border transition ${kind === id ? 'bg-navy text-white border-navy' : 'bg-white border-hair text-navy-deep hover:border-navy'}`}>{l}</button>)}</div>
      <Card className="mb-5 no-print">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {kind === 'daily' && <Field label="اليوم" id="rp-day"><input id="rp-day" type="date" className="input" value={day} onChange={(e) => setDay(e.target.value || today)} /></Field>}
          {showRange && <Field label="من تاريخ" id="rp-f"><input id="rp-f" type="date" className="input" value={f.from} onChange={(e) => set('from')(e.target.value)} /></Field>}
          {showRange && <Field label="إلى تاريخ" id="rp-t"><input id="rp-t" type="date" className="input" value={f.to} onChange={(e) => set('to')(e.target.value)} /></Field>}
          <Field label="المعلم" id="rp-te"><Select value={f.teacher} onChange={set('teacher')} placeholder="الكل" options={db.teachers.map((t) => ({ value: t.id, label: t.name }))} /></Field>
          <Field label="الطالب" id="rp-st"><Select value={f.student} onChange={set('student')} placeholder="الكل" options={db.students.map((t) => ({ value: t.id, label: t.name }))} /></Field>
          <Field label="المادة" id="rp-su"><Select value={f.subject} onChange={set('subject')} placeholder="الكل" options={db.subjects.map((t) => ({ value: t.id, label: t.name }))} /></Field>
          {!['progress', 'outstanding'].includes(kind) && <Field label="الحالة" id="rp-sta"><Select value={f.status} onChange={set('status')} placeholder="الكل" options={Object.entries(LESSON_STATUS).map(([v, x]) => ({ value: v, label: x.label }))} /></Field>}
        </div>
      </Card>
      <div className="hidden print:block mb-4"><h2 className="text-xl">{s.academyName} - {REPORTS.find((r) => r[0] === kind)[1]}</h2><p className="text-sm">{kind === 'daily' ? fmtDate(day) : `${fmtDate(from)} إلى ${fmtDate(to)}`}</p></div>
      {cards && <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">{cards.map(([l, v]) => <Stat key={l} label={l} value={v} />)}</div>}
      <Card title={REPORTS.find((r) => r[0] === kind)[1]}>
        {note && <p className="text-sm text-slate mb-3">{note}</p>}
        {rows.length ? <DataTable rows={rows} columns={cols} /> : <Empty title="لا توجد بيانات في هذه الفترة" text="غيّر الفترة أو عوامل التصفية." />}
      </Card>
    </div>
  )
}
