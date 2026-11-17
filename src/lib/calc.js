import { toMin } from './dates'

export const lessonMinutes = (l) => toMin(l.end) - toMin(l.start)
export const round2 = (n) => Math.round(n * 100) / 100

// Billing rules live in settings: billing ('actual' | 'scheduled'), billAbsent, payTeacherAbsent
export function billableMinutes(l, s) {
  if (l.status === 'completed') return s.billing === 'scheduled' ? lessonMinutes(l) : (l.actualMinutes ?? lessonMinutes(l))
  if (l.status === 'absent' && s.billAbsent) return lessonMinutes(l)
  return 0
}
export function payableMinutes(l, s) {
  if (l.status === 'completed') return s.billing === 'scheduled' ? lessonMinutes(l) : (l.actualMinutes ?? lessonMinutes(l))
  if (l.status === 'absent' && s.payTeacherAbsent) return lessonMinutes(l)
  return 0
}

export function payStatus(charges, paid) {
  if (charges <= 0 && paid <= 0) return 'none'
  if (paid >= charges - 0.001) return 'paid'
  if (paid <= 0) return 'unpaid'
  return 'partial'
}

const cache = new WeakMap()
// Single pass over lessons/payments. Derived values are never stored, so edits can't double count.
export function accounts(db) {
  if (cache.has(db)) return cache.get(db)
  const out = computeAccounts(db)
  cache.set(db, out)
  return out
}

export function computeAccounts(db) {
  const s = db.settings
  const students = {}
  const teachers = {}
  db.students.forEach((x) => (students[x.id] = { minutes: 0, lessons: 0, paid: 0 }))
  db.teachers.forEach((x) => (teachers[x.id] = { minutes: 0, lessons: 0, paid: 0 }))
  for (const l of db.lessons) {
    const b = billableMinutes(l, s)
    const p = payableMinutes(l, s)
    if (students[l.studentId] && b > 0) {
      students[l.studentId].minutes += b
      students[l.studentId].lessons++
    }
    if (teachers[l.teacherId] && p > 0) {
      teachers[l.teacherId].minutes += p
      teachers[l.teacherId].lessons++
    }
  }
  for (const p of db.payments) {
    const t = p.type === 'student' ? students : teachers
    if (t[p.refId]) t[p.refId].paid += p.amount
  }
  db.students.forEach((x) => {
    const a = students[x.id]
    a.hours = a.minutes / 60
    a.rate = x.fee
    a.charges = round2(a.hours * x.fee)
    a.paid = round2(a.paid)
    a.balance = round2(a.charges - a.paid)
    a.status = payStatus(a.charges, a.paid)
  })
  db.teachers.forEach((x) => {
    const a = teachers[x.id]
    a.hours = a.minutes / 60
    a.rate = x.rate
    a.earnings = round2(a.hours * x.rate)
    a.paid = round2(a.paid)
    a.balance = round2(a.earnings - a.paid)
    a.status = payStatus(a.earnings, a.paid)
  })
  return { students, teachers }
}

export function totals(db) {
  const a = accounts(db)
  const sv = Object.values(a.students)
  const tv = Object.values(a.teachers)
  const sum = (arr, k) => round2(arr.reduce((t, x) => t + x[k], 0))
  return {
    studentCharges: sum(sv, 'charges'),
    studentPaid: sum(sv, 'paid'),
    studentBalance: sum(sv, 'balance'),
    studentHours: sum(sv, 'hours'),
    teacherEarnings: sum(tv, 'earnings'),
    teacherPaid: sum(tv, 'paid'),
    teacherBalance: sum(tv, 'balance'),
    teacherHours: sum(tv, 'hours'),
  }
}

export function findConflicts(db, cand, ignoreId) {
  const s = toMin(cand.start)
  const e = toMin(cand.end)
  return db.lessons.filter(
    (l) =>
      l.id !== ignoreId &&
      l.date === cand.date &&
      l.status !== 'cancelled' &&
      (l.teacherId === cand.teacherId || l.studentId === cand.studentId) &&
      toMin(l.start) < e &&
      toMin(l.end) > s,
  )
}

export const getTeacher = (db, id) => db.teachers.find((t) => t.id === id)
export const getStudent = (db, id) => db.students.find((t) => t.id === id)
export const getParent = (db, id) => db.parents.find((t) => t.id === id)
export const getSubject = (db, id) => db.subjects.find((t) => t.id === id)
export const teacherStudents = (db, tid) => db.students.filter((s) => s.assignments.some((a) => a.teacherId === tid))
export const studentTeachers = (db, s) => [...new Set(s.assignments.map((a) => a.teacherId))].map((id) => getTeacher(db, id)).filter(Boolean)
export const parentChildren = (db, pid) => db.students.filter((s) => s.parentId === pid)
// 'u-admin' is a role address: every admin account receives it.
export const notificationsFor = (db, uid) => {
  const isAdmin = db.users.find((u) => u.id === uid)?.role === 'admin'
  return db.notifications.filter((n) => n.userIds.includes(uid) || (isAdmin && n.userIds.includes('u-admin'))).sort((a, b) => b.at.localeCompare(a.at))
}
export const lessonSort = (a, b) => (a.date + a.start).localeCompare(b.date + b.start)

export function attendanceStats(lessons) {
  const rec = lessons.filter((l) => ['completed', 'absent', 'incomplete'].includes(l.status))
  const present = rec.filter((l) => l.status !== 'absent').length
  const absent = rec.filter((l) => l.status === 'absent').length
  return { total: rec.length, present, absent, late: rec.filter((l) => l.attendance === 'late').length, rate: rec.length ? Math.round((present / rec.length) * 100) : 100 }
}

export function subjectScores(db, studentId) {
  const res = {}
  db.assessments
    .filter((a) => a.studentId === studentId)
    .forEach((a) => {
      ;(res[a.subjectId] ||= []).push(a)
    })
  return Object.entries(res).map(([subjectId, list]) => {
    list.sort((a, b) => a.date.localeCompare(b.date))
    const avg = Math.round(list.reduce((t, x) => t + (x.score / x.max) * 100, 0) / list.length)
    const first = (list[0].score / list[0].max) * 100
    const last = (list[list.length - 1].score / list[list.length - 1].max) * 100
    return { subjectId, list, avg, trend: Math.round(last - first) }
  })
}
export const overallAvg = (rows) => (rows.length ? Math.round(rows.reduce((t, r) => t + r.avg, 0) / rows.length) : 0)
