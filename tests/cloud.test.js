// Runs supabase/schema.sql on a real Postgres (PGlite, in-process) and checks that
// (1) the app's row mapping round-trips without loss and (2) row-level security
// shows each role only what it should, for reads and for writes.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { buildSeed } from '../src/lib/seed'
import * as E from '../src/lib/engine'
import { buildDb, emptyDb, diffDb } from '../src/lib/rows'
import { notificationsFor } from '../src/lib/calc'

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
const PRELUDE = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`

let pg
const uuids = {}
const seed = buildSeed()

const as = async (appId) => {
  await pg.exec('reset role')
  if (!appId) {
    await pg.exec(`select set_config('request.jwt.claim.sub', '', false); set role anon`)
  } else {
    await pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uuids[appId]])
    await pg.exec('set role authenticated')
  }
}
const rows = async (sql) => (await pg.query(sql)).rows.map((r) => r.j ?? r)
const agg = async (sql) => (await pg.query(`select coalesce(jsonb_agg(x), '[]'::jsonb) as j from (${sql}) x`)).rows[0].j

// What the browser gets from PostgREST (RLS applies to every embedded table too).
async function loadRaw(isAnon) {
  if (isAnon) {
    return {
      settings: (await agg('select data from settings'))[0]?.data,
      teachersPublic: await agg('select * from teachers_public'),
      stats: (await pg.query('select public_stats() as j')).rows[0].j,
    }
  }
  return {
    settings: (await agg('select data from settings'))[0]?.data,
    teachersPublic: await agg('select * from teachers_public'),
    teachers: await agg('select * from teachers'),
    parents: await agg('select * from parents'),
    students: await agg(`select s.*, (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from assignments a where a.student_id = s.id) as assignments from students s`),
    lessons: await agg('select * from lessons'),
    homework: await agg('select * from homework'),
    reports: await agg('select * from reports'),
    assessments: await agg('select * from assessments'),
    payments: await agg('select * from payments'),
    notifications: await agg(`select n.*, (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from notification_recipients r where r.notification_id = n.id) as notification_recipients,
      (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from notification_reads r where r.notification_id = n.id) as notification_reads from notifications n`),
    messages: await agg('select * from messages'),
    profiles: await agg('select * from profiles'),
    stats: (await pg.query('select public_stats() as j')).rows[0].j,
  }
}
const load = async (appId) => { await as(appId); return buildDb(await loadRaw(!appId)) }
const save = async (appId, before, after) => {
  const d = diffDb(before, after, appId)
  await as(appId)
  if (!d.empty) await pg.query('select apply_changes($1::jsonb)', [JSON.stringify(d.changes)])
  return d
}
const act = async (appId, before, name, ...args) => {
  const draft = structuredClone(before)
  const res = E[name](draft, ...args)
  expect(res.ok, res.error).not.toBe(false)
  await save(appId, before, draft)
  return draft
}
const rejects = async (appId, before, name, ...args) => {
  const draft = structuredClone(before)
  const res = E[name](draft, ...args)
  expect(res.ok, res.error).not.toBe(false)
  await expect(save(appId, before, draft)).rejects.toThrow()
}

beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(PRELUDE)
  await pg.exec(schema)
  // accounts: one auth user + profile per seed user (the Edge Function does this in production)
  for (const u of seed.users) {
    uuids[u.id] = randomUUID()
    await pg.query('insert into auth.users (id) values ($1)', [uuids[u.id]])
    await pg.query('insert into profiles (id, app_id, role, name, username, email, auth_email, ref_id) values ($1,$2,$3,$4,$5,$6,$7,$8)', [uuids[u.id], u.id, u.role, u.name, u.username, u.email, u.email, u.refId])
  }
  // admin loads the whole demo dataset through the same code path the app uses
  const full = structuredClone(seed)
  const empty = await load('u-admin')
  await save('u-admin', empty, full)
}, 120000)

describe('schema and mapping', () => {
  it('round-trips the whole dataset losslessly for the admin', async () => {
    const a = await load('u-admin')
    const d = diffDb(seed, a, 'u-admin')
    expect(Object.keys(d.changes).filter((k) => !['notifications', 'reads'].includes(k))).toEqual([])
    expect(a.lessons.length).toBe(seed.lessons.length)
    expect(a.students.length).toBe(seed.students.length)
    expect(a.users.length).toBe(seed.users.length)
    const adminNotifs = seed.notifications.filter((n) => n.userIds.includes('u-admin'))
    expect(notificationsFor(a, 'u-admin').length).toBe(adminNotifs.length)
  })

  it('repeated saves are idempotent (no diff after a reload)', async () => {
    const a = await load('u-admin')
    const b = await load('u-admin')
    expect(diffDb(a, b, 'u-admin').empty).toBe(true)
  })
})

describe('row level security: reads', () => {
  it('visitors see only the public site data', async () => {
    const a = await load(null)
    expect(a.students).toEqual([])
    expect(a.lessons).toEqual([])
    expect(a.payments).toEqual([])
    expect(a.users).toEqual([])
    expect(a.teachers.length).toBe(seed.teachers.length)
    expect(a.teachers.every((t) => t.rate === 0 && t.phone === '' && t.email === '')).toBe(true)
    expect(a.publicStats.students).toBe(seed.students.length)
    expect(a.settings.academyName).toBe(seed.settings.academyName)
  })

  it('a parent sees only their own children and their data', async () => {
    const p = seed.parents[0]
    const kids = seed.students.filter((s) => s.parentId === p.id)
    const a = await load(`u-${p.id}`)
    expect(a.students.map((s) => s.id).sort()).toEqual(kids.map((s) => s.id).sort())
    expect(a.parents.map((x) => x.id)).toEqual([p.id])
    expect(a.lessons.length).toBeGreaterThan(0)
    expect(a.lessons.every((l) => kids.some((k) => k.id === l.studentId))).toBe(true)
    expect(a.payments.every((x) => x.type === 'student' && kids.some((k) => k.id === x.refId))).toBe(true)
    expect(a.users.length).toBe(1)
    expect(a.teachers.every((t) => t.rate === 0)).toBe(true)
    expect(a.messages).toEqual([])
    expect(notificationsFor(a, `u-${p.id}`).length).toBeGreaterThan(0)
    expect(a.notifications.every((n) => n.userIds.includes(`u-${p.id}`))).toBe(true)
  })

  it('a teacher sees own students, own lessons, own pay and own rate only', async () => {
    const t = seed.teachers[0]
    const a = await load(`u-${t.id}`)
    expect(a.students.length).toBeGreaterThan(0)
    expect(a.students.every((s) => s.assignments.some((x) => x.teacherId === t.id))).toBe(true)
    expect(a.lessons.every((l) => l.teacherId === t.id)).toBe(true)
    expect(a.payments.every((p) => p.type === 'teacher' && p.refId === t.id)).toBe(true)
    expect(a.teachers.find((x) => x.id === t.id).rate).toBe(t.rate)
    expect(a.teachers.filter((x) => x.id !== t.id).every((x) => x.rate === 0)).toBe(true)
  })

  it('a student sees only themself', async () => {
    const s = seed.students[0]
    const a = await load(`u-${s.id}`)
    expect(a.students.map((x) => x.id)).toEqual([s.id])
    expect(a.lessons.every((l) => l.studentId === s.id)).toBe(true)
  })

  it('a deactivated account sees nothing', async () => {
    const s = seed.students[1]
    await pg.exec('reset role')
    await pg.query(`update profiles set active = false where app_id = $1`, [`u-${s.id}`])
    const a = await load(`u-${s.id}`)
    expect(a.students).toEqual([])
    expect(a.lessons).toEqual([])
    await pg.exec('reset role')
    await pg.query(`update profiles set active = true where app_id = $1`, [`u-${s.id}`])
  })
})

describe('row level security: writes', () => {
  it('a teacher can record a lesson and notify others', async () => {
    const t = seed.teachers[0]
    const me = `u-${t.id}`
    let a = await load(me)
    const l = a.lessons.find((x) => x.status === 'upcoming')
    a = await act(me, a, 'recordLesson', { id: l.id, teacherId: l.teacherId, studentId: l.studentId, subjectId: l.subjectId, date: l.date, start: l.start, end: l.end, attendance: 'present', completion: 'completed', actualStart: l.start, actualEnd: l.end, summary: 'شرح الدرس', homework: 'حل التمارين', perfNote: 'ممتاز' })
    const b = await load(me)
    expect(b.lessons.find((x) => x.id === l.id).status).toBe('completed')
    expect(b.homework.some((h) => h.lessonId === l.id)).toBe(true)
    const adm = await load('u-admin')
    expect(notificationsFor(adm, 'u-admin').some((n) => n.body.includes('دقيقة') && !n.readBy.includes('u-admin'))).toBe(true)
    const kid = seed.students.find((s) => s.id === l.studentId)
    const par = await load(`u-${kid.parentId}`)
    expect(notificationsFor(par, `u-${kid.parentId}`).some((n) => n.kind === 'report')).toBe(true)
  })

  it('a teacher cannot touch money, students, or other teachers lessons', async () => {
    const t = seed.teachers[0]
    const me = `u-${t.id}`
    const a = await load(me)
    const draft = structuredClone(a)
    draft.payments.push({ id: 'PAY-X', type: 'teacher', refId: t.id, amount: 999, date: '2026-10-01', method: 'نقدًا', note: '', createdAt: new Date().toISOString() })
    await expect(save(me, a, draft)).rejects.toThrow()
    const d2 = structuredClone(a)
    d2.students[0].fee = 1
    await expect(save(me, a, d2)).rejects.toThrow()
    const all = await load('u-admin')
    const stranger = all.students.find((s) => !a.students.some((x) => x.id === s.id))
    const other = all.lessons.find((l) => l.studentId === stranger.id)
    const d3 = structuredClone(a)
    d3.lessons.push({ ...other, id: 'L-HIJACK', teacherId: t.id })
    await expect(save(me, a, d3)).rejects.toThrow()
  })

  it('a parent cannot write lessons or payments', async () => {
    const p = seed.parents[0]
    const me = `u-${p.id}`
    const a = await load(me)
    const d = structuredClone(a)
    d.lessons[0].status = 'cancelled'
    await expect(save(me, a, d)).rejects.toThrow()
    const d2 = structuredClone(a)
    d2.payments.push({ id: 'PAY-Y', type: 'student', refId: a.students[0].id, amount: 5, date: '2026-10-01', method: 'نقدًا', note: '', createdAt: new Date().toISOString() })
    await expect(save(me, a, d2)).rejects.toThrow()
  })

  it('a student can submit homework but cannot edit it', async () => {
    const s = seed.students.find((x) => seed.homework.some((h) => h.studentId === x.id && h.status === 'pending'))
    const me = `u-${s.id}`
    const a = await load(me)
    const hw = a.homework.find((h) => h.status === 'pending')
    await act(me, a, 'setHomeworkStatus', hw.id, 'submitted')
    const b = await load(me)
    expect(b.homework.find((h) => h.id === hw.id).status).toBe('submitted')
    const d = structuredClone(b)
    d.homework.find((h) => h.id === hw.id).title = 'تعديل غير مسموح'
    await expect(save(me, b, d)).rejects.toThrow()
  })

  it('admin can create, pay, and delete; cascades work', async () => {
    let a = await load('u-admin')
    a = await act('u-admin', a, 'addTeacher', { name: 'معلم جديد', rate: 120, subjects: ['math'] })
    const t = a.teachers.find((x) => x.name === 'معلم جديد')
    expect(t.id).toMatch(/^T-[2-9A-Z]{7}$/)
    const newUser = a.users.find((u) => u.refId === t.id)
    expect(newUser).toBeTruthy()
    a = await act('u-admin', a, 'addPayment', { type: 'teacher', refId: seed.teachers[1].id, amount: 10, date: '2026-10-20', method: 'نقدًا' })
    const b = await load('u-admin')
    expect(b.teachers.some((x) => x.id === t.id)).toBe(true)
    expect(b.users.some((u) => u.id === newUser.id)).toBe(false) // account rows come only from the Edge Function
    expect(b.payments.length).toBe(a.payments.length)
    // delete a student: lessons, homework, assignments disappear with it
    const sid = seed.students[2].id
    await act('u-admin', b, 'deleteStudent', sid)
    const c = await load('u-admin')
    expect(c.students.some((s) => s.id === sid)).toBe(false)
    expect(c.lessons.some((l) => l.studentId === sid)).toBe(false)
    expect((await pg.query('select count(*)::int n from assignments where student_id = $1', [sid])).rows[0].n).toBe(0)
  })

  it('reading a notification is remembered per user', async () => {
    const p = seed.parents[3]
    const me = `u-${p.id}`
    let a = await load(me)
    const unread = notificationsFor(a, me).filter((n) => !n.readBy.includes(me))
    expect(unread.length).toBeGreaterThan(0)
    a = await act(me, a, 'markAllRead', me)
    const b = await load(me)
    expect(notificationsFor(b, me).filter((n) => !n.readBy.includes(me))).toEqual([])
    // another user's unread state is untouched
    const other = await load('u-admin')
    expect(notificationsFor(other, 'u-admin').length).toBeGreaterThan(0)
  })

  it('visitors can send a contact message and the admin is notified', async () => {
    await as(null)
    await pg.query(`insert into messages (name, phone, email, message) values ($1,$2,$3,$4)`, ['زائر', '+20 100 000 0000', 'v@example.com', 'أريد الاستفسار عن المواعيد'])
    await expect(pg.query(`insert into messages (name, message) values ('x','y')`)).rejects.toThrow()
    await expect(pg.query('select * from messages')).rejects.toThrow() // anon has no read access
    const adm = await load('u-admin')
    expect(adm.messages.length).toBe(1)
    expect(notificationsFor(adm, 'u-admin').some((n) => n.kind === 'message')).toBe(true)
    // a teacher cannot read messages
    const t = await load(`u-${seed.teachers[0].id}`)
    expect(t.messages).toEqual([])
  })

  it('visitors cannot call apply_changes', async () => {
    await as(null)
    await expect(pg.query(`select apply_changes('{"settings":{"academyName":"x"}}'::jsonb)`)).rejects.toThrow()
  })

  it('only admin can change settings', async () => {
    const t = `u-${seed.teachers[0].id}`
    const a = await load(t)
    const d = structuredClone(a)
    d.settings.academyName = 'اختراق'
    await save(t, a, d) // silently ignored or rejected, but never applied
      .catch(() => {})
    expect((await load(null)).settings.academyName).toBe(seed.settings.academyName)
  })
})

describe('empty database', () => {
  it('builds a usable empty db', () => {
    const e = emptyDb()
    expect(e.students).toEqual([])
    expect(e.settings.academyName).toBeTruthy()
  })
})
