// Demo backend: everything lives in this browser (localStorage). Used when no Supabase keys are configured.
import { buildSeed, DB_VERSION, DEMO_PASSWORD } from '../seed'
import * as engine from '../engine'

const KEY = 'subul_db_v1'
const SESSION = 'subul_session'

function persist(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch (e) { console.warn('تعذر حفظ البيانات في المتصفح', e) }
}
function loadDb() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch (e) { /* fall through to a fresh seed */ }
  const fresh = buildSeed()
  persist(fresh)
  return fresh
}
const readSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION) || sessionStorage.getItem(SESSION) || 'null') } catch (e) { return null }
}

export const localBackend = {
  mode: 'local',
  async init() { return { session: readSession() } },
  async load() { return loadDb() },
  async login(identifier, password, remember) {
    const db = loadDb()
    const id = identifier.trim().toLowerCase()
    const u = db.users.find((x) => x.email.toLowerCase() === id || x.username.toLowerCase() === id)
    if (!u || u.password !== password) return { ok: false, error: 'بيانات الدخول غير صحيحة' }
    if (!u.active) return { ok: false, error: 'هذا الحساب معطّل. تواصل مع الإدارة.' }
    localStorage.removeItem(SESSION)
    sessionStorage.removeItem(SESSION)
    ;(remember ? localStorage : sessionStorage).setItem(SESSION, JSON.stringify({ userId: u.id }))
    return { ok: true, session: { userId: u.id } }
  },
  async logout() { localStorage.removeItem(SESSION); sessionStorage.removeItem(SESSION) },
  // `after` is the full db; the demo simply stores all of it.
  async save(_before, after) { persist(after); return { ok: true } },
  async resetDemo() { const d = buildSeed(); persist(d); return d },
  async createUsers() { return [] },
  async deleteUsers() {},
  async resetPassword(db, id) {
    const d = structuredClone(db)
    engine.resetPassword(d, id)
    const u = d.users.find((x) => x.id === id)
    persist(d)
    return { db: d, credentials: u ? [{ name: u.name, username: u.username, password: DEMO_PASSWORD }] : [] }
  },
  async sendMessage() { return null }, // handled by the engine action in demo mode
  subscribeExternal(cb) {
    const f = (e) => { if (e.key === KEY && e.newValue) cb(JSON.parse(e.newValue)) }
    window.addEventListener('storage', f)
    return () => window.removeEventListener('storage', f)
  },
}
