// Edge Function: إدارة الحسابات (إنشاء / حذف / إعادة تعيين كلمة المرور). يستدعيها المدير فقط.
// تحتاج مفتاح service_role، وهو متاح تلقائيًا داخل Supabase Edge Functions ولا يصل للمتصفح أبدًا.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const URL_ = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// بريد الدخول الفعلي مصطنع (المستخدم يدخل باسم المستخدم) فلا نحتاج بريدًا حقيقيًا لكل طالب.
const DOMAIN = Deno.env.get('AUTH_EMAIL_DOMAIN') || 'accounts.subul-academy.com'
const ROLES = ['admin', 'teacher', 'student', 'parent']
const OWNER = 'u-admin'

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })

// 12 حرفًا بدون الحروف المتشابهة (0/O و 1/l/I)
function password(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const b = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(b, (x) => A[x % A.length]).join('')
}
const slug = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40)

async function caller(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const userClient = createClient(URL_, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) return null
  const { data: p } = await admin.from('profiles').select('id, app_id, role, active').eq('id', data.user.id).maybeSingle()
  return p && p.active && p.role === 'admin' ? p : null
}

async function uniqueUsername(base: string): Promise<string> {
  const b = slug(base) || 'user'
  for (let i = 0; i < 50; i++) {
    const cand = i === 0 ? b : `${b}${i + 1}`
    const { data } = await admin.from('profiles').select('id').ilike('username', cand).maybeSingle()
    if (!data) return cand
  }
  return `${b}${Date.now() % 100000}`
}

async function createOne(u: any) {
  if (!u?.appId || !ROLES.includes(u.role) || !String(u.name || '').trim()) throw new Error('بيانات الحساب غير مكتملة')
  if (u.role !== 'admin' && !u.refId) throw new Error('رقم الربط مطلوب لهذا الدور')
  const { data: exists } = await admin.from('profiles').select('id').eq('app_id', u.appId).maybeSingle()
  if (exists) throw new Error('الحساب موجود بالفعل')
  const username = await uniqueUsername(u.username || u.appId)
  const authEmail = `${username}@${DOMAIN}`
  const pw = password()
  const { data: created, error } = await admin.auth.admin.createUser({ email: authEmail, password: pw, email_confirm: true })
  if (error || !created.user) throw new Error(error?.message || 'تعذر إنشاء الحساب')
  const { error: pe } = await admin.from('profiles').insert({
    id: created.user.id, app_id: u.appId, role: u.role, name: String(u.name).trim(), username,
    email: u.email || null, auth_email: authEmail, ref_id: u.refId || null, active: true,
  })
  if (pe) {
    await admin.auth.admin.deleteUser(created.user.id) // لا نترك حسابًا بدون ملف
    throw new Error(pe.message)
  }
  return { appId: u.appId, name: String(u.name).trim(), username, password: pw }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'الطريقة غير مدعومة' }, 405)
  try {
    const me = await caller(req)
    if (!me) return json({ error: 'غير مصرّح: هذه العملية للمدير فقط' }, 403)
    const body = await req.json()

    if (body.action === 'create') {
      const list = Array.isArray(body.users) ? body.users.slice(0, 50) : []
      const out = []
      for (const u of list) out.push(await createOne(u))
      return json({ users: out })
    }

    if (body.action === 'delete') {
      const ids: string[] = Array.isArray(body.appIds) ? body.appIds : []
      for (const appId of ids) {
        if (appId === OWNER || appId === me.app_id) continue // لا يُحذف المالك ولا المدير نفسه
        const { data: p } = await admin.from('profiles').select('id').eq('app_id', appId).maybeSingle()
        if (p) await admin.auth.admin.deleteUser(p.id) // الملف يُحذف تلقائيًا (cascade)
      }
      return json({ ok: true })
    }

    if (body.action === 'reset') {
      const { data: p } = await admin.from('profiles').select('id, name, username').eq('app_id', body.appId).maybeSingle()
      if (!p) return json({ error: 'المستخدم غير موجود' }, 404)
      const pw = password()
      const { error } = await admin.auth.admin.updateUserById(p.id, { password: pw })
      if (error) throw new Error(error.message)
      return json({ users: [{ appId: body.appId, name: p.name, username: p.username, password: pw }] })
    }

    return json({ error: 'إجراء غير معروف' }, 400)
  } catch (e) {
    return json({ error: (e as Error).message || 'حدث خطأ غير متوقع' }, 400)
  }
})
