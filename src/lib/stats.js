import { billableMinutes, payableMinutes, getStudent, round2, lessonMinutes } from './calc'
import { addDays, weekStart, addMonths, monthKey, fmtMonthShort, fmtDay, todayISO } from './dates'

export function weeklyActivity(db, anchor = todayISO()) {
  const ws = weekStart(anchor)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i)
    const ls = db.lessons.filter((l) => l.date === d)
    return {
      day: fmtDay(d), date: d,
      completed: ls.filter((l) => l.status === 'completed').length,
      upcoming: ls.filter((l) => l.status === 'upcoming').length,
      other: ls.filter((l) => ['cancelled', 'absent', 'incomplete'].includes(l.status)).length,
    }
  })
}

export function monthlyFinance(db, n = 6, anchor = todayISO()) {
  const keys = Array.from({ length: n }, (_, i) => monthKey(addMonths(anchor, i - (n - 1))))
  const m = Object.fromEntries(keys.map((k) => [k, { key: k, month: fmtMonthShort(k), charges: 0, earnings: 0, received: 0 }]))
  for (const l of db.lessons) {
    const r = m[monthKey(l.date)]
    if (!r) continue
    const st = getStudent(db, l.studentId)
    const t = db.teachers.find((x) => x.id === l.teacherId)
    if (st) r.charges += (billableMinutes(l, db.settings) / 60) * st.fee
    if (t) r.earnings += (payableMinutes(l, db.settings) / 60) * t.rate
  }
  for (const p of db.payments) if (p.type === 'student' && m[monthKey(p.date)]) m[monthKey(p.date)].received += p.amount
  return keys.map((k) => ({ ...m[k], charges: round2(m[k].charges), earnings: round2(m[k].earnings), received: round2(m[k].received) }))
}

export const lessonHours = (l) => (l.actualMinutes ?? lessonMinutes(l)) / 60
