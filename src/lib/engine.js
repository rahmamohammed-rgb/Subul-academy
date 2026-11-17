// Pure data actions. Every action receives a draft copy of the db and mutates it.
// To move to a real backend, replace each action with an API call returning the same result shape.
import { computeAccounts as accounts, findConflicts, getStudent, getTeacher, getSubject, lessonMinutes, round2 } from './calc'
import { toMin, fromMin, todayISO } from './dates'
import { DEMO_PASSWORD } from './seed'

// Random ids: several people can create records at the same time without colliding.
const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const nid = (d, p) => {
  let r = ''
  const bytes = globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(new Uint8Array(7)) : Array.from({ length: 7 }, () => Math.floor(Math.random() * 256))
  for (const b of bytes) r += ALPHA[b % ALPHA.length]
  return `${p}-${r}`
}
const PREF = { upcoming: 'lessonReminders', schedule: 'lessonReminders', completed: 'completions', absent: 'absences', report: 'reports', homework: 'reports', payment: 'payments', reminder: 'payments', message: null }

export function notify(d, userIds, kind, title, body, link) {
  const pref = PREF[kind]
  if (pref && d.settings.notifPrefs[pref] === false) return
  const ids = [...new Set(userIds.filter(Boolean))]
  if (!ids.length) return
  const at = new Date().toISOString()
  const dup = d.notifications.find((n) => n.title === title && n.body === body && n.userIds.join() === ids.join() && Date.now() - new Date(n.at).getTime() < 5000)
  if (dup) return
  d.notifications.push({ id: nid(d, 'N'), userIds: ids, kind, title, body, at, link, readBy: [] })
}
const parentUser = (d, sid) => `u-${getStudent(d, sid)?.parentId}`
const nameOf = (d, sid) => getStudent(d, sid)?.name || ''
const subName = (d, id) => getSubject(d, id)?.name || ''
const fail = (error) => ({ ok: false, error })
const money = (d, n) => `${n} ${d.settings.currency === 'USD' ? 'دولار' : 'ج.م'}`

/* ---------- teachers ---------- */
export function addTeacher(d, data) {
  if (!data.name?.trim()) return fail('اسم المعلم مطلوب')
  if (!(data.rate > 0)) return fail('أدخل أجر الساعة بشكل صحيح')
  if (!data.subjects?.length) return fail('اختر مادة واحدة على الأقل')
  const id = nid(d, 'T')
  const t = { id, status: 'active', gender: 'm', experience: 1, bio: '', qualifications: '', phone: '', email: '', ...data, name: data.name.trim(), rate: Number(data.rate) }
  d.teachers.push(t)
  d.users.push({ id: `u-${id}`, role: 'teacher', name: t.name, username: id.toLowerCase(), email: t.email || `${id.toLowerCase()}@subul.demo`, password: DEMO_PASSWORD, refId: id, active: true })
  return { ok: true, id }
}
export function updateTeacher(d, id, data) {
  const t = getTeacher(d, id)
  if (!t) return fail('المعلم غير موجود')
  if (data.rate !== undefined && !(Number(data.rate) > 0)) return fail('أجر الساعة غير صالح')
  Object.assign(t, data, data.rate !== undefined ? { rate: Number(data.rate) } : {})
  const u = d.users.find((x) => x.refId === id && x.role === 'teacher')
  if (u) u.name = t.name
  return { ok: true }
}
export function deleteTeacher(d, id) {
  d.teachers = d.teachers.filter((t) => t.id !== id)
  d.users = d.users.filter((u) => u.refId !== id || u.role !== 'teacher')
  d.lessons = d.lessons.filter((l) => l.teacherId !== id)
  d.payments = d.payments.filter((p) => !(p.type === 'teacher' && p.refId === id))
  d.homework = d.homework.filter((h) => h.teacherId !== id)
  d.reports = d.reports.filter((h) => h.teacherId !== id)
  d.students.forEach((s) => (s.assignments = s.assignments.filter((a) => a.teacherId !== id)))
  return { ok: true }
}

/* ---------- parents ---------- */
export function addParent(d, data) {
  if (!data.name?.trim()) return fail('اسم ولي الأمر مطلوب')
  const id = nid(d, 'P')
  d.parents.push({ id, relation: 'الأب', phone: '', email: '', ...data, name: data.name.trim() })
  d.users.push({ id: `u-${id}`, role: 'parent', name: data.name.trim(), username: id.toLowerCase(), email: data.email || `${id.toLowerCase()}@subul.demo`, password: DEMO_PASSWORD, refId: id, active: true })
  return { ok: true, id }
}
export function updateParent(d, id, data) {
  const p = d.parents.find((x) => x.id === id)
  if (!p) return fail('ولي الأمر غير موجود')
  Object.assign(p, data)
  const u = d.users.find((x) => x.refId === id && x.role === 'parent')
  if (u) u.name = p.name
  return { ok: true }
}
export function deleteParent(d, id) {
  if (d.students.some((s) => s.parentId === id)) return fail('لا يمكن حذف ولي أمر مرتبط بطلاب. انقل الطلاب أولًا.')
  d.parents = d.parents.filter((p) => p.id !== id)
  d.users = d.users.filter((u) => !(u.refId === id && u.role === 'parent'))
  return { ok: true }
}

/* ---------- students ---------- */
function validateStudent(d, data) {
  if (!data.name?.trim()) return 'اسم الطالب مطلوب'
  if (!data.grade) return 'اختر المرحلة الدراسية'
  if (!data.parentId) return 'اختر ولي الأمر'
  if (!(Number(data.fee) > 0)) return 'أدخل رسوم الساعة للطالب'
  if (!data.assignments?.length) return 'أضف مادة ومعلمًا واحدًا على الأقل'
  for (const a of data.assignments) {
    if (!a.subjectId || !a.teacherId) return 'أكمل اختيار المادة والمعلم لكل صف'
    if (!getTeacher(d, a.teacherId)?.subjects.includes(a.subjectId)) return 'المعلم المختار لا يدرّس هذه المادة'
  }
  return null
}
export function addStudent(d, data) {
  const err = validateStudent(d, data)
  if (err) return fail(err)
  const id = nid(d, 'S')
  d.students.push({ id, status: 'active', gender: 'm', notes: '', joined: todayISO(), ...data, name: data.name.trim(), fee: Number(data.fee) })
  const n = d.users.filter((u) => u.role === 'student').length + 1
  d.users.push({ id: `u-${id}`, role: 'student', name: data.name.trim(), username: `student${n}`, email: `student${n}@subul.demo`, password: DEMO_PASSWORD, refId: id, active: true })
  notify(d, ['u-admin'], 'schedule', 'تمت إضافة طالب جديد', `${data.name.trim()} - ${data.grade}`, { type: 'student', id })
  data.assignments.forEach((a) => notify(d, [`u-${a.teacherId}`], 'schedule', 'تم تعيين طالب جديد لك', `${data.name.trim()} - ${subName(d, a.subjectId)}`, { type: 'student', id }))
  return { ok: true, id }
}
export function updateStudent(d, id, data) {
  const s = getStudent(d, id)
  if (!s) return fail('الطالب غير موجود')
  const err = validateStudent(d, { ...s, ...data })
  if (err) return fail(err)
  Object.assign(s, data, data.fee !== undefined ? { fee: Number(data.fee) } : {})
  const u = d.users.find((x) => x.refId === id && x.role === 'student')
  if (u) u.name = s.name
  return { ok: true }
}
export function deleteStudent(d, id) {
  d.students = d.students.filter((s) => s.id !== id)
  d.users = d.users.filter((u) => !(u.refId === id && u.role === 'student'))
  ;['lessons', 'homework', 'reports', 'assessments'].forEach((k) => (d[k] = d[k].filter((x) => x.studentId !== id)))
  d.payments = d.payments.filter((p) => !(p.type === 'student' && p.refId === id))
  return { ok: true }
}

/* ---------- lessons ---------- */
export function validateLesson(d, data) {
  const e = {}
  if (!data.teacherId) e.teacherId = 'اختر المعلم'
  if (!data.studentId) e.studentId = 'اختر الطالب'
  if (!data.subjectId) e.subjectId = 'اختر المادة'
  if (!data.date) e.date = 'حدد التاريخ'
  if (!data.start) e.start = 'حدد وقت البداية'
  if (!data.end) e.end = 'حدد وقت النهاية'
  if (data.start && data.end && toMin(data.end) <= toMin(data.start)) e.end = 'وقت النهاية يجب أن يكون بعد وقت البداية'
  if (data.start && data.end && toMin(data.end) - toMin(data.start) > 240) e.end = 'مدة الحصة لا تتجاوز 4 ساعات'
  if (data.teacherId && data.studentId && data.subjectId) {
    const s = getStudent(d, data.studentId)
    if (!s?.assignments.some((a) => a.teacherId === data.teacherId && a.subjectId === data.subjectId)) e.subjectId = 'هذا المعلم غير مكلّف بتدريس هذه المادة لهذا الطالب'
  }
  return e
}

export function saveLesson(d, data, id) {
  const errors = validateLesson(d, data)
  if (Object.keys(errors).length) return { ok: false, errors, error: Object.values(errors)[0] }
  const conflicts = findConflicts(d, data, id)
  if (conflicts.length && !data.ignoreConflicts) return { ok: false, conflicts, error: 'يوجد تعارض في المواعيد' }
  const fields = { teacherId: data.teacherId, studentId: data.studentId, subjectId: data.subjectId, date: data.date, start: data.start, end: data.end, type: data.type || 'inperson', notes: data.notes || '' }
  if (id) {
    const l = d.lessons.find((x) => x.id === id)
    if (!l) return fail('الحصة غير موجودة')
    const changed = l.date !== fields.date || l.start !== fields.start || l.end !== fields.end || l.teacherId !== fields.teacherId
    Object.assign(l, fields)
    if (changed && l.status === 'upcoming') notify(d, [`u-${l.studentId}`, parentUser(d, l.studentId), `u-${l.teacherId}`], 'schedule', 'تغيير في الجدول', `تم تعديل موعد حصة ${subName(d, l.subjectId)} إلى ${l.date} الساعة ${l.start}`, { type: 'lesson', id: l.id })
    return { ok: true, id }
  }
  const dupe = d.lessons.find((l) => l.teacherId === fields.teacherId && l.studentId === fields.studentId && l.date === fields.date && l.start === fields.start && l.status !== 'cancelled')
  if (dupe) return fail('هذه الحصة مسجلة مسبقًا بنفس الموعد')
  const lid = nid(d, 'L')
  d.lessons.push({ id: lid, ...fields, status: 'upcoming', attendance: null, actualStart: null, actualEnd: null, actualMinutes: null, summary: '', homework: '', perfNote: '' })
  notify(d, [`u-${fields.studentId}`, parentUser(d, fields.studentId), `u-${fields.teacherId}`], 'schedule', 'حصة جديدة مجدولة', `${subName(d, fields.subjectId)} - ${fields.date} الساعة ${fields.start}`, { type: 'lesson', id: lid })
  return { ok: true, id: lid }
}

export function cancelLesson(d, id, reason) {
  const l = d.lessons.find((x) => x.id === id)
  if (!l) return fail('الحصة غير موجودة')
  if (l.status === 'cancelled') return fail('الحصة ملغاة بالفعل')
  l.status = 'cancelled'
  l.attendance = null
  l.actualMinutes = null
  l.actualStart = l.actualEnd = null
  l.notes = reason || l.notes
  notify(d, [`u-${l.studentId}`, parentUser(d, l.studentId), `u-${l.teacherId}`, 'u-admin'], 'schedule', 'تم إلغاء حصة', `حصة ${subName(d, l.subjectId)} بتاريخ ${l.date} (${nameOf(d, l.studentId)})`, { type: 'lesson', id })
  return { ok: true }
}

// Quick attendance: absent flips status to 'absent' (not billable by default)
export function markAttendance(d, id, attendance) {
  const l = d.lessons.find((x) => x.id === id)
  if (!l) return fail('الحصة غير موجودة')
  if (l.status === 'cancelled') return fail('لا يمكن تسجيل حضور لحصة ملغاة')
  const prev = l.status
  l.attendance = attendance
  if (attendance === 'absent') {
    l.status = 'absent'
    l.actualMinutes = 0
    if (prev !== 'absent') notify(d, ['u-admin', parentUser(d, l.studentId)], 'absent', 'تم تسجيل غياب', `لم يحضر ${nameOf(d, l.studentId)} حصة ${subName(d, l.subjectId)}`, { type: 'lesson', id })
  } else if (prev === 'absent') l.status = 'upcoming'
  return { ok: true }
}

export function recordLesson(d, p) {
  const errors = {}
  const base = validateLesson(d, p)
  Object.entries(base).forEach(([k, v]) => (errors[k] = v))
  if (!p.attendance) errors.attendance = 'حدد حالة الحضور'
  if (!p.completion) errors.completion = 'حدد حالة الحصة'
  const absent = p.attendance === 'absent'
  let minutes = 0
  if (!absent) {
    if (!p.actualStart) errors.actualStart = 'أدخل وقت البدء الفعلي'
    if (!p.actualEnd) errors.actualEnd = 'أدخل وقت الانتهاء الفعلي'
    if (p.actualStart && p.actualEnd) {
      minutes = toMin(p.actualEnd) - toMin(p.actualStart)
      if (minutes <= 0) errors.actualEnd = 'وقت الانتهاء يجب أن يكون بعد وقت البدء'
      else if (minutes > 360) errors.actualEnd = 'المدة الفعلية غير منطقية'
    }
    if (p.completion === 'completed' && !p.summary?.trim()) errors.summary = 'اكتب ملخص الحصة'
  }
  if (Object.keys(errors).length) return { ok: false, errors, error: Object.values(errors)[0] }

  // identify an existing lesson: by id, otherwise by teacher+student+date+scheduled start (prevents duplicates)
  let l = (p.id && d.lessons.find((x) => x.id === p.id)) || d.lessons.find((x) => x.teacherId === p.teacherId && x.studentId === p.studentId && x.date === p.date && x.start === p.start && x.status !== 'cancelled' && x.id !== undefined)
  const isNew = !l
  if (isNew) {
    const conflicts = findConflicts(d, p, null)
    if (conflicts.length && !p.ignoreConflicts) return { ok: false, conflicts, error: 'يوجد تعارض مع حصة أخرى لنفس المعلم أو الطالب' }
    l = { id: nid(d, 'L'), type: p.type || 'inperson', notes: '' }
    d.lessons.push(l)
  }
  const prev = { status: l.status, minutes: l.actualMinutes }
  Object.assign(l, { teacherId: p.teacherId, studentId: p.studentId, subjectId: p.subjectId, date: p.date, start: p.start, end: p.end })
  l.status = absent ? 'absent' : p.completion === 'completed' ? 'completed' : 'incomplete'
  l.attendance = p.attendance
  l.actualStart = absent ? null : p.actualStart
  l.actualEnd = absent ? null : p.actualEnd
  l.actualMinutes = absent ? 0 : minutes
  l.summary = p.summary?.trim() || ''
  l.homework = p.homework?.trim() || ''
  l.perfNote = p.perfNote?.trim() || ''
  l.notes = p.notes?.trim() || l.notes || ''
  l.recordedAt = new Date().toISOString()

  const sid = l.studentId
  const link = { type: 'lesson', id: l.id }
  const people = [`u-${sid}`, parentUser(d, sid)]
  if (l.status === 'completed' && prev.status !== 'completed') {
    notify(d, [...people, 'u-admin'], 'completed', 'اكتملت حصة', `${nameOf(d, sid)} - ${subName(d, l.subjectId)} (${l.actualMinutes} دقيقة)`, link)
    if (l.summary) notify(d, people, 'report', 'تقرير حصة جديد', l.summary, { type: 'student', id: sid })
  } else if (l.status === 'absent' && prev.status !== 'absent') {
    notify(d, ['u-admin', `u-${l.teacherId}`, ...people], 'absent', 'غياب طالب', `${nameOf(d, sid)} لم يحضر حصة ${subName(d, l.subjectId)}`, link)
  } else if (!isNew && prev.status === l.status && prev.minutes !== l.actualMinutes) {
    notify(d, ['u-admin', ...people], 'schedule', 'تعديل تسجيل حصة', `تم تعديل مدة حصة ${subName(d, l.subjectId)} إلى ${l.actualMinutes} دقيقة`, link)
  }
  // homework linked to this lesson: create once, update afterwards
  const hw = d.homework.find((h) => h.lessonId === l.id)
  if (l.homework && l.status !== 'absent') {
    if (hw) hw.title = l.homework
    else {
      const due = fromDateAdd(l.date, 3)
      d.homework.push({ id: nid(d, 'H'), studentId: sid, teacherId: l.teacherId, subjectId: l.subjectId, lessonId: l.id, title: l.homework, dueDate: due, createdAt: l.date, status: 'pending' })
      notify(d, people, 'homework', 'واجب جديد', `${l.homework} - تسليم ${due}`, { type: 'student', id: sid })
    }
  }
  return { ok: true, id: l.id, created: isNew }
}
const fromDateAdd = (date, n) => {
  const [y, m, dd] = date.split('-').map(Number)
  const x = new Date(y, m - 1, dd + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function deleteLesson(d, id) {
  d.lessons = d.lessons.filter((l) => l.id !== id)
  d.homework = d.homework.filter((h) => h.lessonId !== id)
  return { ok: true }
}

/* ---------- homework / reports ---------- */
export function addHomework(d, data) {
  if (!data.studentId || !data.title?.trim() || !data.dueDate) return fail('أكمل بيانات الواجب')
  const id = nid(d, 'H')
  d.homework.push({ id, status: 'pending', createdAt: todayISO(), lessonId: null, ...data, title: data.title.trim() })
  notify(d, [`u-${data.studentId}`, parentUser(d, data.studentId)], 'homework', 'واجب جديد', `${data.title.trim()} - تسليم ${data.dueDate}`, { type: 'student', id: data.studentId })
  return { ok: true, id }
}
export function setHomeworkStatus(d, id, status) {
  const h = d.homework.find((x) => x.id === id)
  if (!h) return fail('الواجب غير موجود')
  h.status = status
  if (status === 'submitted') notify(d, [`u-${h.teacherId}`], 'homework', 'تسليم واجب', `${nameOf(d, h.studentId)} سلّم: ${h.title}`, { type: 'student', id: h.studentId })
  return { ok: true }
}
export function addReport(d, data) {
  if (!data.studentId || !data.text?.trim()) return fail('اكتب نص التقرير')
  const id = nid(d, 'R')
  d.reports.push({ id, date: todayISO(), rating: 4, lessonId: null, ...data, text: data.text.trim() })
  notify(d, [`u-${data.studentId}`, parentUser(d, data.studentId)], 'report', 'تقرير جديد عن الطالب', data.text.trim(), { type: 'student', id: data.studentId })
  return { ok: true, id }
}

/* ---------- payments ---------- */
export function addPayment(d, data) {
  const amount = round2(Number(data.amount))
  if (!(amount > 0)) return fail('أدخل مبلغًا صحيحًا أكبر من صفر')
  if (!data.refId) return fail('اختر الطالب أو المعلم')
  if (!data.date) return fail('حدد تاريخ الدفعة')
  if (!data.method) return fail('اختر طريقة الدفع')
  const acc = accounts(d)
  const a = (data.type === 'student' ? acc.students : acc.teachers)[data.refId]
  if (!a) return fail('الحساب غير موجود')
  if (amount > a.balance + 0.001) return fail(`المبلغ أكبر من الرصيد المتبقي (${money(d, a.balance)})`)
  const dupe = d.payments.find((p) => p.type === data.type && p.refId === data.refId && p.amount === amount && p.date === data.date && p.method === data.method && Date.now() - new Date(p.createdAt).getTime() < 15000)
  if (dupe) return fail('تم تسجيل هذه الدفعة للتو، تجنّبًا للتكرار')
  const id = nid(d, 'PAY')
  d.payments.push({ id, type: data.type, refId: data.refId, amount, date: data.date, method: data.method, note: data.note || '', createdAt: new Date().toISOString() })
  if (data.type === 'student') {
    const s = getStudent(d, data.refId)
    notify(d, ['u-admin', `u-${s.parentId}`], 'payment', 'تم تسجيل دفعة', `${money(d, amount)} - ${s.name} (${data.method})`, { type: 'payment', id })
  } else {
    notify(d, ['u-admin', `u-${data.refId}`], 'payment', 'تم تسجيل دفعة للمعلم', `${money(d, amount)} - ${getTeacher(d, data.refId).name}`, { type: 'payment', id })
  }
  return { ok: true, id }
}
export function deletePayment(d, id) {
  d.payments = d.payments.filter((p) => p.id !== id)
  return { ok: true }
}

/* ---------- notifications / settings / users ---------- */
export function markRead(d, uid, id) {
  const n = d.notifications.find((x) => x.id === id)
  if (n && !n.readBy.includes(uid)) n.readBy.push(uid)
  return { ok: true }
}
export function markAllRead(d, uid, ids) {
  const isAdmin = d.users.find((u) => u.id === uid)?.role === 'admin'
  d.notifications.forEach((n) => {
    if ((n.userIds.includes(uid) || (isAdmin && n.userIds.includes('u-admin'))) && (!ids || ids.includes(n.id)) && !n.readBy.includes(uid)) n.readBy.push(uid)
  })
  return { ok: true }
}
export function updateSettings(d, patch) {
  d.settings = { ...d.settings, ...patch }
  return { ok: true }
}
export function toggleUser(d, id) {
  const u = d.users.find((x) => x.id === id)
  if (!u) return fail('المستخدم غير موجود')
  if (u.id === 'u-admin') return fail('لا يمكن تعطيل حساب المالك')
  u.active = !u.active
  return { ok: true }
}
export function resetPassword(d, id) {
  const u = d.users.find((x) => x.id === id)
  if (u) u.password = DEMO_PASSWORD
  return { ok: true }
}
export function addAdminUser(d, data) {
  if (!data.name?.trim() || !/^\S+@\S+\.\S+$/.test(data.email || '')) return fail('أدخل اسمًا وبريدًا إلكترونيًا صحيحين')
  if (d.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) return fail('البريد الإلكتروني مستخدم بالفعل')
  d.users.push({ id: nid(d, 'u'), role: 'admin', name: data.name.trim(), username: data.email.split('@')[0], email: data.email, password: DEMO_PASSWORD, refId: null, active: true })
  return { ok: true }
}
export function addMessage(d, data) {
  d.messages.push({ id: nid(d, 'M'), ...data, at: new Date().toISOString() })
  notify(d, ['u-admin'], 'message', 'رسالة جديدة من الموقع', `${data.name}: ${data.message.slice(0, 80)}`, { type: 'settings' })
  return { ok: true }
}
export { lessonMinutes }
