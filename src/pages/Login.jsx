import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, UserRound, GraduationCap, Users, ArrowRight, LogIn } from 'lucide-react'
import Logo from '../components/Logo'
import { Field, Modal, Notice, toast } from '../components/ui'
import { login, useDb, isCloud } from '../lib/store'
import { go, Link } from '../lib/router'
import { DEMO_PASSWORD } from '../lib/seed'

const DEMOS = [
  { role: 'admin', label: 'الإدارة', icon: ShieldCheck, id: 'admin@subul.demo', hint: 'صلاحيات كاملة' },
  { role: 'teacher', label: 'المعلم', icon: UserRound, id: 'teacher1@subul.demo', hint: 'طلابه وحصصه فقط' },
  { role: 'student', label: 'الطالب', icon: GraduationCap, id: 'student1@subul.demo', hint: 'سجلاته الخاصة' },
  { role: 'parent', label: 'ولي الأمر', icon: Users, id: 'parent1@subul.demo', hint: 'أبناؤه فقط' },
]

export default function Login({ onDone }) {
  const db = useDb()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [forgot, setForgot] = useState(false)
  const [busy, setBusy] = useState(false)

  const doLogin = async (ident, pass) => {
    if (busy) return
    if (!ident.trim() || !pass) return setErr('أدخل اسم المستخدم أو البريد وكلمة المرور')
    setBusy(true)
    const r = await login(ident, pass, remember)
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    setErr('')
    toast(`مرحبًا ${r.user.name}`)
    onDone?.()
    go('/app/home')
  }
  const submit = (e) => { e.preventDefault(); doLogin(id, pw) }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.05fr] bg-cream">
      <div className="relative bg-navy-deep pattern text-white hidden lg:flex flex-col justify-between p-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#c9d6e6] hover:text-white"><ArrowRight size={16} /> العودة إلى الموقع</Link>
        <div>
          <div className="eyebrow !text-gold text-2xl">{db.settings.subTagline}</div>
          <h1 className="text-6xl !text-white leading-tight mt-3">معًا نصنع<br />مستقبلًا <span className="text-gold">أفضل</span></h1>
          <p className="mt-6 text-lg text-[#c9d6e6] max-w-md leading-loose">منصة واحدة تجمع الإدارة والمعلمين والطلاب وأولياء الأمور: جدولة، حضور، تقارير، وحسابات واضحة.</p>
        </div>
        <div className="text-sm text-[#8fa6c0]">{isCloud ? 'بياناتك محمية ولا يراها إلا من له صلاحية عليها.' : 'حسابات العرض التجريبي خيالية، والبيانات محفوظة في متصفحك فقط.'}</div>
      </div>
      <div className="flex items-center justify-center p-5 md:p-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center justify-between"><Logo settings={db.settings} /><Link to="/" className="lg:hidden text-sm font-semibold text-navy">الموقع</Link></div>
          <h2 className="text-3xl">تسجيل الدخول</h2>
          <p className="text-slate mt-1 mb-6">أهلًا بعودتك، أدخل بياناتك للمتابعة.</p>
          <form onSubmit={submit} noValidate className="card card-pad flex flex-col gap-4">
            {err && <Notice tone="bad">{err}</Notice>}
            <Field label="اسم المستخدم أو البريد الإلكتروني" id="l-id" required><input id="l-id" className="input" dir="ltr" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} /></Field>
            <Field label="كلمة المرور" id="l-pw" required>
              <div className="relative">
                <input id="l-pw" className="input pe-12" dir="ltr" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} className="absolute inset-y-0 end-0 px-3 text-slate hover:text-navy">{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </Field>
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold"><input type="checkbox" className="size-4 accent-[#12385B]" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> تذكّرني</label>
              <button type="button" className="text-sm font-bold text-navy underline underline-offset-4" onClick={() => setForgot(true)}>نسيت كلمة المرور؟</button>
            </div>
            <button className="btn btn-primary !min-h-[50px]" disabled={busy}><LogIn size={18} /> {busy ? 'جارٍ الدخول...' : 'دخول'}</button>
          </form>

          {!isCloud && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3"><span className="h-px flex-1 bg-hair" /><span className="text-sm font-bold text-slate">أو ادخل بحساب تجريبي</span><span className="h-px flex-1 bg-hair" /></div>
            <div className="grid grid-cols-2 gap-3">
              {DEMOS.map((d) => (
                <button key={d.role} data-demo={d.role} onClick={() => doLogin(d.id, DEMO_PASSWORD)} className="card p-3.5 text-start flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-pop transition">
                  <span className="size-10 rounded-lg bg-navy text-gold inline-flex items-center justify-center shrink-0"><d.icon size={20} /></span>
                  <span><span className="block font-extrabold text-navy-deep">{d.label}</span><span className="block text-xs text-slate">{d.hint}</span></span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate mt-3">كلمة المرور لجميع الحسابات التجريبية: <span dir="ltr" className="font-bold text-navy-deep">{DEMO_PASSWORD}</span></p>
          </div>
          )}
        </div>
      </div>
      <Modal open={forgot} onClose={() => setForgot(false)} title="استعادة كلمة المرور" footer={<button className="btn btn-primary" onClick={() => setForgot(false)}>حسنًا</button>}>
        {isCloud
          ? <Notice tone="info">لا تُرسل كلمات المرور بالبريد. تواصل مع إدارة الأكاديمية لإعادة تعيين كلمة المرور، وستصلك كلمة مرور مؤقتة.</Notice>
          : <Notice tone="info">هذا عرض تجريبي ولا يرسل رسائل بريد فعلية. للحسابات التجريبية استخدم كلمة المرور <b dir="ltr">{DEMO_PASSWORD}</b>، وللحسابات الحقيقية تطلب الإدارة إعادة التعيين من صفحة الإعدادات.</Notice>}
      </Modal>
    </div>
  )
}
