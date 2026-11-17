import { describe, it, expect } from 'vitest'
import { buildSeed } from '../src/lib/seed'
import * as E from '../src/lib/engine'
import { accounts, totals, teacherStudents, parentChildren, notificationsFor, findConflicts } from '../src/lib/calc'
import { todayISO, addDays } from '../src/lib/dates'

const clone = (d) => structuredClone(d)
const step = (d, fn, ...a) => {
  const n = clone(d)
  const r = E[fn](n, ...a)
  return [r.ok === false ? d : n, r]
}

describe('seed integrity', () => {
  const d = buildSeed()
  it('has required volumes', () => {
    expect(d.teachers.length).toBeGreaterThanOrEqual(8)
    expect(d.students.length).toBeGreaterThanOrEqual(24)
    expect(d.parents.length).toBeGreaterThanOrEqual(8)
  })
  it('relationships are consistent', () => {
    d.students.forEach((s) => {
      expect(d.parents.find((p) => p.id === s.parentId)).toBeTruthy()
      s.assignments.forEach((a) => expect(d.teachers.find((t) => t.id === a.teacherId).subjects).toContain(a.subjectId))
    })
    d.lessons.forEach((l) => {
      const s = d.students.find((x) => x.id === l.studentId)
      expect(s.assignments.some((a) => a.teacherId === l.teacherId && a.subjectId === l.subjectId)).toBe(true)
    })
  })
  it('seed has no teacher/student overlaps', () => {
    const bad = d.lessons.filter((l) => findConflicts(d, l, l.id).length)
    expect(bad.length).toBe(0)
  })
})

describe('end-to-end workflow (engine level)', () => {
  it('runs the mandatory scenario', () => {
    let d = buildSeed()
    const teacher = d.teachers[0]
    const parent = d.parents[0]
    // 2-4: add student with separate fee/rate
    let r
    ;[d, r] = step(d, 'updateTeacher', teacher.id, { rate: 100 })
    expect(r.ok).toBe(true)
    ;[d, r] = step(d, 'addStudent', { name: 'طالب تجريبي', grade: 'الصف الأول الثانوي', parentId: parent.id, fee: 200, assignments: [{ subjectId: 'math', teacherId: teacher.id }] })
    expect(r.ok).toBe(true)
    const sid = r.id
    expect(parentChildren(d, parent.id).some((s) => s.id === sid)).toBe(true)
    expect(teacherStudents(d, teacher.id).some((s) => s.id === sid)).toBe(true)
    // 5: schedule
    const date = addDays(todayISO(), 20)
    ;[d, r] = step(d, 'saveLesson', { teacherId: teacher.id, studentId: sid, subjectId: 'math', date, start: '10:00', end: '11:00', type: 'online' })
    expect(r.ok).toBe(true)
    const lid = r.id
    expect(accounts(d).students[sid].hours).toBe(0) // scheduled != billable
    // duplicate scheduling rejected
    ;[, r] = step(d, 'saveLesson', { teacherId: teacher.id, studentId: sid, subjectId: 'math', date, start: '10:00', end: '11:00' })
    expect(r.ok).toBe(false)
    // 6: record 90 min
    const rec = { id: lid, teacherId: teacher.id, studentId: sid, subjectId: 'math', date, start: '10:00', end: '11:00', actualStart: '10:00', actualEnd: '11:30', attendance: 'present', completion: 'completed', summary: 'شرح الدوال', homework: 'تمارين 1-5' }
    const before = accounts(d)
    ;[d, r] = step(d, 'recordLesson', rec)
    expect(r.ok).toBe(true)
    let a = accounts(d)
    expect(a.students[sid].hours).toBe(1.5)
    expect(a.teachers[teacher.id].hours - before.teachers[teacher.id].hours).toBeCloseTo(1.5)
    expect(a.students[sid].charges).toBe(300)
    expect(a.teachers[teacher.id].earnings - before.teachers[teacher.id].earnings).toBeCloseTo(150) // separate rate
    // saving same record again must not duplicate
    const count = d.lessons.length
    ;[d, r] = step(d, 'recordLesson', rec)
    ;[d, r] = step(d, 'recordLesson', { ...rec, id: undefined })
    expect(d.lessons.length).toBe(count)
    expect(accounts(d).students[sid].hours).toBe(1.5)
    expect(d.homework.filter((h) => h.lessonId === lid).length).toBe(1)
    // notifications
    expect(notificationsFor(d, `u-${sid}`).some((n) => n.kind === 'completed')).toBe(true)
    expect(notificationsFor(d, `u-${parent.id}`).some((n) => n.kind === 'completed')).toBe(true)
    // 10-11: partial payment
    ;[d, r] = step(d, 'addPayment', { type: 'student', refId: sid, amount: 120, date: todayISO(), method: 'نقدًا' })
    expect(r.ok).toBe(true)
    expect(accounts(d).students[sid].balance).toBe(180)
    expect(accounts(d).students[sid].status).toBe('partial')
    ;[, r] = step(d, 'addPayment', { type: 'student', refId: sid, amount: 500, date: todayISO(), method: 'نقدًا' })
    expect(r.ok).toBe(false) // overpay blocked
    ;[, r] = step(d, 'addPayment', { type: 'student', refId: sid, amount: 120, date: todayISO(), method: 'نقدًا' })
    expect(r.ok).toBe(false) // duplicate guard
    // 12: edit duration to 60 min
    ;[d, r] = step(d, 'recordLesson', { ...rec, actualEnd: '11:00' })
    a = accounts(d)
    expect(a.students[sid].hours).toBe(1)
    expect(a.students[sid].charges).toBe(200)
    expect(a.students[sid].balance).toBe(80)
    // 13: cancel a separate lesson
    ;[d, r] = step(d, 'saveLesson', { teacherId: teacher.id, studentId: sid, subjectId: 'math', date, start: '13:00', end: '14:00' })
    const l2 = r.id
    ;[d, r] = step(d, 'cancelLesson', l2, 'اختبار')
    expect(r.ok).toBe(true)
    expect(accounts(d).students[sid].hours).toBe(1)
    // absent / incomplete are not billable
    ;[d, r] = step(d, 'recordLesson', { ...rec, attendance: 'absent', completion: 'completed' })
    expect(accounts(d).students[sid].hours).toBe(0)
    ;[d, r] = step(d, 'recordLesson', { ...rec, completion: 'incomplete', summary: '' })
    expect(accounts(d).students[sid].hours).toBe(0)
    // totals consistent
    const t = totals(d)
    expect(t.studentBalance).toBeCloseTo(t.studentCharges - t.studentPaid)
  })
})
