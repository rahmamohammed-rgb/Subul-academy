import { useSyncExternalStore } from 'react'
import * as engine from './engine'
import { backend, isCloud } from './backend'
import { emptyDb } from './rows'

export { isCloud }

// The UI works on an in-memory db and calls act() for every change. act() updates the screen
// immediately, then saves in the background (queued, in order). If the server refuses a change,
// the screen is rolled back to what the server has and an error event is raised.
let db = emptyDb()
let session = null
let status = 'loading' // loading | ready | error
let initError = ''
let pending = 0
let needsReload = false
let chain = Promise.resolve()
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const fire = (type, detail) => { try { window.dispatchEvent(new CustomEvent(type, { detail })) } catch { /* no window */ } }
const subscribe = (cb) => (listeners.add(cb), () => listeners.delete(cb))
const errText = (e) => e?.message || String(e)

export const getDb = () => db
export const useDb = () => useSyncExternalStore(subscribe, () => db)
export const getStatus = () => status
export const useStatus = () => useSyncExternalStore(subscribe, () => status)
export const getInitError = () => initError
export const getSession = () => session

async function reload() {
  db = await backend.load(session)
  emit()
}

export async function init() {
  status = 'loading'
  emit()
  try {
    const r = await backend.init()
    session = r.session
    db = await backend.load(session)
    status = 'ready'
    startSync()
  } catch (e) {
    console.error(e)
    initError = errText(e)
    status = 'error'
  }
  emit()
}

let syncStarted = false
function startSync() {
  if (syncStarted) return
  syncStarted = true
  backend.subscribeExternal((d) => { if (!pending) { db = d; emit() } })
  const tick = async () => {
    if (!isCloud || !session || pending || document.hidden) return
    try {
      const fresh = await backend.load(session)
      if (pending) return
      const key = (x) => JSON.stringify({ ...x, meta: 0 })
      if (key(fresh) !== key(db)) { db = fresh; emit() }
    } catch { /* offline: try again next time */ }
  }
  setInterval(tick, 30000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick() })
}

function enqueue(before, after) {
  pending++
  chain = chain.then(async () => {
    try {
      const r = await backend.save(before, after, session)
      if (!r?.ok) throw new Error(r?.error || 'تعذر حفظ التغييرات')
      if (r.credentials?.length) fire('subul:credentials', r.credentials)
      if (r.reload) needsReload = true
    } catch (e) {
      fire('subul:error', errText(e))
      needsReload = true
    } finally {
      pending--
      if (pending === 0 && needsReload) {
        needsReload = false
        try { await reload() } catch (e) { fire('subul:error', errText(e)) }
      }
      emit()
    }
  })
}

export function act(name, ...args) {
  const before = db
  const draft = structuredClone(db)
  const res = engine[name](draft, ...args)
  if (res && res.ok !== false) {
    db = draft
    emit()
    enqueue(before, draft)
  }
  return res
}

export const isSaving = () => pending > 0

export async function resetDemo() {
  if (isCloud) return
  db = await backend.resetDemo()
  emit()
}

export async function resetUserPassword(id) {
  try {
    const r = await backend.resetPassword(db, id)
    if (r.db) { db = r.db; emit() }
    fire('subul:credentials', r.credentials)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errText(e) }
  }
}

export async function submitMessage(f) {
  if (!isCloud) return act('addMessage', f)
  try { await backend.sendMessage(f); return { ok: true } } catch (e) { return { ok: false, error: errText(e) } }
}

/* ---- session ---- */
export async function login(identifier, password, remember) {
  const r = await backend.login(identifier, password, remember)
  if (!r.ok) return r
  session = r.session
  try {
    db = await backend.load(session)
  } catch (e) {
    await backend.logout()
    session = null
    return { ok: false, error: 'تعذر تحميل البيانات: ' + errText(e) }
  }
  const user = db.users.find((u) => u.id === session.userId && u.active)
  if (!user) {
    await backend.logout()
    session = null
    try { await reload() } catch { /* ignore */ }
    return { ok: false, error: 'تعذر العثور على الحساب. تواصل مع الإدارة.' }
  }
  emit()
  return { ok: true, user }
}

export function logout() {
  session = null
  backend.logout()
  emit()
  backend.load(null).then((d) => { db = d; emit() }).catch(() => { db = emptyDb(); emit() })
}
