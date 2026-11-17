// Pure mapping between the app's in-memory db shape (camelCase, nested) and Postgres rows (snake_case).
// Used only in cloud mode. Keeping it pure makes it testable without a network.
import { SUBJECTS, DEFAULT_SETTINGS, DB_VERSION } from './seed'

const ts = (v) => (v ? new Date(v).toISOString() : null)
const n = (v) => (v === null || v === undefined ? v : Number(v))

export const MAP = {
  teachers: {
    to: (t) => ({ id: t.id, name: t.name, gender: t.gender || 'm', subjects: t.subjects || [], experience: t.experience || 0, rate: t.rate || 0, bio: t.bio || '', qualifications: t.qualifications || '', phone: t.phone || '', email: t.email || '', status: t.status || 'active' }),
    from: (r) => ({ id: r.id, name: r.name, gender: r.gender, subjects: r.subjects || [], experience: r.experience, rate: n(r.rate ?? 0), bio: r.bio || '', qualifications: r.qualifications || '', phone: r.phone ?? '', email: r.email ?? '', status: r.status }),
  },
  parents: {
    to: (p) => ({ id: p.id, name: p.name, phone: p.phone || '', email: p.email || '', relation: p.relation || 'الأب' }),
    from: (r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, relation: r.relation }),
  },
  students: {
    to: (s) => ({ id: s.id, name: s.name, gender: s.gender || 'm', grade: s.grade, parent_id: s.parentId, fee: s.fee || 0, status: s.status || 'active', joined: s.joined, notes: s.notes || '', assignments: (s.assignments || []).map((a) => ({ subject_id: a.subjectId, teacher_id: a.teacherId })).sort((a, b) => (a.subject_id + a.teacher_id).localeCompare(b.subject_id + b.teacher_id)) }),
    from: (r) => ({ id: r.id, name: r.name, gender: r.gender, grade: r.grade, parentId: r.parent_id, fee: n(r.fee), status: r.status, joined: r.joined, notes: r.notes, assignments: (r.assignments || []).map((a) => ({ subjectId: a.subject_id, teacherId: a.teacher_id })).sort((a, b) => (a.subjectId + a.teacherId).localeCompare(b.subjectId + b.teacherId)) }),
  },
  lessons: {
    to: (l) => ({ id: l.id, teacher_id: l.teacherId, student_id: l.studentId, subject_id: l.subjectId, lesson_date: l.date, start_time: l.start, end_time: l.end, type: l.type || 'inperson', status: l.status || 'upcoming', notes: l.notes || '', attendance: l.attendance ?? null, actual_start: l.actualStart ?? null, actual_end: l.actualEnd ?? null, actual_minutes: l.actualMinutes ?? null, summary: l.summary || '', homework: l.homework || '', perf_note: l.perfNote || '', recorded_at: ts(l.recordedAt) }),
    from: (r) => {
      const l = { id: r.id, teacherId: r.teacher_id, studentId: r.student_id, subjectId: r.subject_id, date: r.lesson_date, start: r.start_time, end: r.end_time, type: r.type, status: r.status, notes: r.notes, attendance: r.attendance, actualStart: r.actual_start, actualEnd: r.actual_end, actualMinutes: r.actual_minutes, summary: r.summary, homework: r.homework, perfNote: r.perf_note }
      if (r.recorded_at) l.recordedAt = ts(r.recorded_at)
      return l
    },
  },
  homework: {
    to: (h) => ({ id: h.id, student_id: h.studentId, teacher_id: h.teacherId, subject_id: h.subjectId, lesson_id: h.lessonId ?? null, title: h.title, due_date: h.dueDate, created_on: h.createdAt, status: h.status || 'pending' }),
    from: (r) => ({ id: r.id, studentId: r.student_id, teacherId: r.teacher_id, subjectId: r.subject_id, lessonId: r.lesson_id, title: r.title, dueDate: r.due_date, createdAt: r.created_on, status: r.status }),
  },
  reports: {
    to: (x) => ({ id: x.id, student_id: x.studentId, teacher_id: x.teacherId, subject_id: x.subjectId, lesson_id: x.lessonId ?? null, report_date: x.date, rating: x.rating ?? 4, text: x.text }),
    from: (r) => ({ id: r.id, studentId: r.student_id, teacherId: r.teacher_id, subjectId: r.subject_id, lessonId: r.lesson_id, date: r.report_date, rating: r.rating, text: r.text }),
  },
  assessments: {
    to: (a) => ({ id: a.id, student_id: a.studentId, subject_id: a.subjectId, title: a.title, score: a.score, max: a.max ?? 100, taken_on: a.date }),
    from: (r) => ({ id: r.id, studentId: r.student_id, subjectId: r.subject_id, title: r.title, score: n(r.score), max: n(r.max), date: r.taken_on }),
  },
  payments: {
    to: (p) => ({ id: p.id, type: p.type, ref_id: p.refId, amount: p.amount, pay_date: p.date, method: p.method, note: p.note || '', created_at: ts(p.createdAt) || new Date().toISOString() }),
    from: (r) => ({ id: r.id, type: r.type, refId: r.ref_id, amount: n(r.amount), date: r.pay_date, method: r.method, note: r.note, createdAt: ts(r.created_at) }),
  },
}
const SYNCED = ['parents', 'teachers', 'students', 'lessons', 'homework', 'reports', 'assessments', 'payments']

/** Build the app db from rows fetched (already filtered by RLS for the signed-in role). */
export function buildDb(raw) {
  // A live site must never show the demo phone/email/address: they stay empty until the admin fills them in.
  const settings = { ...structuredClone(DEFAULT_SETTINGS), phone: '', email: '', address: '', ...(raw.settings || {}) }
  settings.notifPrefs = { ...DEFAULT_SETTINGS.notifPrefs, ...(raw.settings?.notifPrefs || {}) }
  const teachers = new Map()
  for (const r of raw.teachersPublic || []) teachers.set(r.id, MAP.teachers.from(r))
  for (const r of raw.teachers || []) teachers.set(r.id, MAP.teachers.from(r))
  const db = {
    version: DB_VERSION,
    meta: { loadedAt: new Date().toISOString() },
    settings,
    subjects: SUBJECTS,
    users: (raw.profiles || []).map((p) => ({ id: p.app_id, role: p.role, name: p.name, username: p.username, email: p.email || p.auth_email, refId: p.ref_id, active: p.active })),
    teachers: [...teachers.values()],
    parents: (raw.parents || []).map(MAP.parents.from),
    students: (raw.students || []).map(MAP.students.from),
    lessons: (raw.lessons || []).map(MAP.lessons.from),
    homework: (raw.homework || []).map(MAP.homework.from),
    reports: (raw.reports || []).map(MAP.reports.from),
    assessments: (raw.assessments || []).map(MAP.assessments.from),
    payments: (raw.payments || []).map(MAP.payments.from),
    notifications: (raw.notifications || []).map((r) => ({
      id: r.id, kind: r.kind, title: r.title, body: r.body, at: ts(r.at), link: r.link || undefined,
      userIds: (r.notification_recipients || []).map((x) => x.recipient),
      readBy: (r.notification_reads || []).map((x) => x.user_id),
    })),
    messages: (raw.messages || []).map((r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, message: r.message, at: ts(r.at) })),
    publicStats: raw.stats || null,
  }
  return db
}

export function emptyDb() {
  return buildDb({})
}

const rowMap = (list, f) => new Map((list || []).map((x) => [x.id, JSON.stringify(f(x))]))

/** Compare two app dbs and return the payload for the apply_changes() SQL function plus side effects. */
export function diffDb(before, after, actorId) {
  const changes = {}
  for (const key of SYNCED) {
    const f = MAP[key].to
    const b = rowMap(before[key], f)
    const up = []
    const seen = new Set()
    for (const x of after[key] || []) {
      seen.add(x.id)
      const row = f(x)
      if (b.get(x.id) !== JSON.stringify(row)) up.push(row)
    }
    const del = [...b.keys()].filter((id) => !seen.has(id))
    if (up.length || del.length) changes[key] = { upsert: up, delete: del }
  }
  if (JSON.stringify(before.settings) !== JSON.stringify(after.settings)) changes.settings = after.settings

  const bN = new Map((before.notifications || []).map((x) => [x.id, x]))
  const notifications = []
  const reads = []
  for (const x of after.notifications || []) {
    const o = bN.get(x.id)
    if (!o) notifications.push({ id: x.id, kind: x.kind, title: x.title, body: x.body || '', at: x.at, link: x.link ?? null, recipients: x.userIds })
    else if (x.readBy.includes(actorId) && !o.readBy.includes(actorId)) reads.push(x.id)
  }
  if (notifications.length) changes.notifications = notifications
  if (reads.length) changes.reads = reads

  const bU = new Map((before.users || []).map((u) => [u.id, u]))
  const aIds = new Set((after.users || []).map((u) => u.id))
  const newUsers = []
  const profiles = []
  for (const u of after.users || []) {
    const o = bU.get(u.id)
    if (!o) newUsers.push(u)
    else if (o.name !== u.name || o.active !== u.active) profiles.push({ app_id: u.id, name: u.name, active: u.active })
  }
  if (profiles.length) changes.profiles = profiles
  const removedUsers = [...bU.keys()].filter((id) => !aIds.has(id))

  return { changes, newUsers, removedUsers, empty: !Object.keys(changes).length && !newUsers.length && !removedUsers.length }
}
