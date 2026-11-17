// Production backend: Supabase Auth + Postgres (row level security) + one Edge Function for account admin.
import { createClient } from '@supabase/supabase-js'
import { buildDb, diffDb } from '../rows'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
const REMEMBER = 'subul_remember'

// "Remember me" off => the session lives only as long as the tab.
const storage = {
  getItem: (k) => { try { return sessionStorage.getItem(k) ?? localStorage.getItem(k) } catch { return null } },
  setItem: (k, v) => { try { (localStorage.getItem(REMEMBER) === '0' ? sessionStorage : localStorage).setItem(k, v) } catch { /* ignore */ } },
  removeItem: (k) => { try { sessionStorage.removeItem(k); localStorage.removeItem(k) } catch { /* ignore */ } },
}

export const supabase = url && anon ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, storage } }) : null

const fail = (error) => ({ ok: false, error })
const msg = (e) => {
  const m = e?.message || String(e)
  if (/غير مسموح|row-level security|permission denied|42501/.test(m + (e?.code || ''))) return 'ليست لديك صلاحية لتنفيذ هذه العملية'
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.'
  return m
}
const must = ({ data, error }) => { if (error) throw error; return data }

// PostgREST returns at most 1000 rows per request; page through larger tables.
async function all(table, select = '*', order = 'id') {
  const out = []
  for (let from = 0; ; from += 1000) {
    const rows = must(await supabase.from(table).select(select).order(order).range(from, from + 999))
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

async function profileFor(user) {
  const { data } = await supabase.from('profiles').select('app_id, active').eq('id', user.id).maybeSingle()
  return data
}

async function callAdmin(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let detail = error.message
    try { const j = await error.context?.json?.(); if (j?.error) detail = j.error } catch { /* keep default */ }
    throw new Error(detail)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export const cloudBackend = {
  mode: 'cloud',
  async init() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return { session: null }
    const p = await profileFor(data.session.user)
    if (!p || !p.active) { await supabase.auth.signOut(); return { session: null } }
    return { session: { userId: p.app_id } }
  },
  async load(session) {
    const stats = must(await supabase.rpc('public_stats'))
    const [settingsRow, teachersPublic] = await Promise.all([
      supabase.from('settings').select('data').eq('id', 1).maybeSingle().then(must),
      all('teachers_public'),
    ])
    const base = { settings: settingsRow?.data, teachersPublic, stats }
    if (!session) return buildDb(base)
    const [teachers, parents, students, lessons, homework, reports, assessments, payments, notifications, messages, profiles] = await Promise.all([
      all('teachers'), all('parents'),
      all('students', '*, assignments(subject_id, teacher_id)'),
      all('lessons'), all('homework'), all('reports'), all('assessments'), all('payments'),
      all('notifications', '*, notification_recipients(recipient), notification_reads(user_id)'),
      all('messages'), all('profiles', '*', 'app_id'),
    ])
    return buildDb({ ...base, teachers, parents, students, lessons, homework, reports, assessments, payments, notifications, messages, profiles })
  },
  async login(identifier, password, remember) {
    try {
      localStorage.setItem(REMEMBER, remember ? '1' : '0')
      const ident = identifier.trim()
      const email = must(await supabase.rpc('resolve_login', { ident }))
      const { data, error } = await supabase.auth.signInWithPassword({ email: email || ident, password })
      if (error) return fail('بيانات الدخول غير صحيحة')
      const p = await profileFor(data.user)
      if (!p) { await supabase.auth.signOut(); return fail('هذا الحساب غير مفعّل في النظام. تواصل مع الإدارة.') }
      if (!p.active) { await supabase.auth.signOut(); return fail('هذا الحساب معطّل. تواصل مع الإدارة.') }
      return { ok: true, session: { userId: p.app_id } }
    } catch (e) { return fail(msg(e)) }
  },
  async logout() { await supabase.auth.signOut() },
  async save(before, after, session) {
    const d = diffDb(before, after, session?.userId)
    if (d.empty) return { ok: true }
    try {
      if (Object.keys(d.changes).length) must(await supabase.rpc('apply_changes', { p: d.changes }))
      let credentials = []
      if (d.newUsers.length) credentials = await this.createUsers(d.newUsers)
      if (d.removedUsers.length) await this.deleteUsers(d.removedUsers)
      return { ok: true, credentials, reload: d.newUsers.length > 0 || d.removedUsers.length > 0 }
    } catch (e) { return fail(msg(e)) }
  },
  async createUsers(users) {
    const res = await callAdmin({ action: 'create', users: users.map((u) => ({ appId: u.id, role: u.role, name: u.name, username: u.username, email: u.email, refId: u.refId })) })
    return res.users
  },
  async deleteUsers(appIds) { await callAdmin({ action: 'delete', appIds }) },
  async resetPassword(_db, appId) {
    const res = await callAdmin({ action: 'reset', appId })
    return { db: null, credentials: res.users }
  },
  async sendMessage(m) {
    const { error } = await supabase.from('messages').insert({ name: m.name.trim(), phone: m.phone.trim(), email: m.email.trim(), message: m.message.trim() })
    if (error) throw new Error(msg(error))
    return true
  },
  subscribeExternal() { return () => {} },
}
