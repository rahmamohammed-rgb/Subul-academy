import { useState } from 'react'
import { Save, Upload, RotateCcw, Check, X, KeyRound, Plus } from 'lucide-react'
import { PageHeader, Card, Tabs, Field, Notice, Modal, Confirm, Badge, DataTable, toast, Empty, Avatar } from '../components/ui'
import { run } from '../components/forms'
import { resetDemo, resetUserPassword, isCloud } from '../lib/store'
import { fmtDateTime } from '../lib/dates'
import { DEMO_PASSWORD } from '../lib/seed'
import { go } from '../lib/router'
import { Link } from '../lib/router'

const ROLES = { admin: 'الإدارة', teacher: 'معلم', student: 'طالب', parent: 'ولي أمر' }
const PERMS = [
  ['إدارة المعلمين والطلاب وأولياء الأمور', [1, 0, 0, 0]], ['جدولة الحصص وتعديلها وإلغاؤها', [1, 1, 0, 0]], ['تسجيل الحصص المنفذة', [1, 1, 0, 0]], ['عرض الحصص والجدول', [1, 1, 1, 1]],
  ['إضافة الواجبات والتقارير وتسجيل الحضور', [1, 1, 0, 0]], ['عرض الدرجات والتقارير والواجبات', [1, 1, 1, 1]], ['المالية: رسوم الطلاب ومستحقات المعلمين', [1, 0, 0, 0]], ['عرض رسوم ومدفوعات الابن', [1, 0, 0, 1]],
  ['التقارير والتصدير', [1, 0, 0, 0]], ['الإعدادات وإدارة المستخدمين', [1, 0, 0, 0]],
]
const NOTIF = [['lessonReminders', 'تذكيرات الحصص والجدولة'], ['completions', 'إكمال الحصص'], ['absences', 'غياب الطلاب'], ['reports', 'التقارير والواجبات'], ['payments', 'المدفوعات']]

export default function Settings({ db, user }) {
  const [tab, setTab] = useState('academy')
  const s = db.settings
  const [a, setA] = useState({ academyName: s.academyName, englishName: s.englishName, tagline: s.tagline, subTagline: s.subTagline, phone: s.phone, email: s.email, address: s.address })
  const [fin, setFin] = useState({ currency: s.currency, billing: s.billing, billAbsent: s.billAbsent, payTeacherAbsent: s.payTeacherAbsent, defaultDuration: s.defaultDuration, durations: s.durations.join('، ') })
  const [reset, setReset] = useState(false)
  const [addU, setAddU] = useState(false)
  const [nu, setNu] = useState({ name: '', email: '' })
  const [err, setErr] = useState('')
  const save = (patch) => { run('updateSettings', patch); toast('تم حفظ الإعدادات') }

  const saveAcademy = (e) => { e.preventDefault(); if (!a.academyName.trim()) return setErr('اسم الأكاديمية مطلوب'); setErr(''); save(a) }
  const saveFin = (e) => {
    e.preventDefault()
    const durations = fin.durations.split(/[,،\s]+/).map(Number).filter((n) => n >= 15 && n <= 300)
    const dd = Number(fin.defaultDuration)
    if (!durations.length || !(dd >= 15)) return setErr('أدخل مددًا صحيحة بالدقائق (من 15 إلى 300)')
    setErr(''); save({ ...fin, durations: [...new Set(durations)].sort((x, y) => x - y), defaultDuration: dd })
  }
  const logo = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 600 * 1024) return toast('اختر صورة أقل من 600 كيلوبايت', 'bad')
    const r = new FileReader(); r.onload = () => save({ logo: r.result }); r.readAsDataURL(file)
  }
  const tabs = [{ id: 'academy', label: 'ملف الأكاديمية' }, { id: 'users', label: 'المستخدمون' }, { id: 'perms', label: 'الصلاحيات' }, { id: 'finance', label: 'المالية والفوترة' }, { id: 'rates', label: 'الأسعار' }, { id: 'notifs', label: 'الإشعارات' }, { id: 'inbox', label: `رسائل الموقع (${db.messages.length})` }, { id: 'data', label: isCloud ? 'قاعدة البيانات' : 'البيانات التجريبية' }]
  const inp = (k, label, props = {}) => <Field label={label} id={`s-${k}`}><input id={`s-${k}`} className="input" value={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.value })} {...props} /></Field>

  return (
    <div>
      <PageHeader title="الإعدادات" sub="إدارة هوية الأكاديمية والمستخدمين وقواعد الفوترة" />
      <Tabs className="mb-6" value={tab} onChange={(t) => { setTab(t); setErr('') }} tabs={tabs} />

      {tab === 'academy' && (
        <div className="grid lg:grid-cols-[1fr_20rem] gap-6">
          <form onSubmit={saveAcademy} className="card card-pad grid sm:grid-cols-2 gap-4">
            {err && <Notice tone="bad" className="sm:col-span-2">{err}</Notice>}
            {inp('academyName', 'اسم الأكاديمية')}{inp('englishName', 'الاسم بالإنجليزية', { dir: 'ltr' })}
            {inp('tagline', 'الشعار الرئيسي')}{inp('subTagline', 'الشعار الفرعي')}
            {inp('phone', 'الهاتف', { dir: 'ltr' })}{inp('email', 'البريد الإلكتروني', { dir: 'ltr' })}
            <div className="sm:col-span-2">{inp('address', 'العنوان')}</div>
            <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary"><Save size={16} /> حفظ الملف</button></div>
          </form>
          <Card title="الشعار والهوية">
            <div className="flex flex-col items-center gap-4"><img src={s.logo || new URL('../assets/logo-mark.png', import.meta.url).href} alt="الشعار الحالي" className="size-28 rounded-full object-contain bg-white ring-2 ring-gold" />
              <label className="btn btn-outline cursor-pointer"><Upload size={16} /> رفع شعار جديد<input type="file" accept="image/*" className="sr-only" onChange={(e) => logo(e.target.files[0])} /></label>
              {s.logo && <button className="btn btn-ghost btn-sm" onClick={() => save({ logo: null })}>استعادة الشعار الأصلي</button>}
              <div className="flex gap-2">{['#12385B', '#0B2540', '#D8A642', '#FBF8F1'].map((c) => <span key={c} title={c} className="size-8 rounded-full border border-hair" style={{ background: c }} />)}</div>
              <p className="text-xs text-slate text-center">ألوان الهوية ثابتة في هذا العرض. {isCloud ? 'الشعار يُحفظ مع بيانات الأكاديمية.' : 'الشعار يُحفظ في متصفحك.'}</p></div>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <Card title="حسابات المستخدمين" action={<button className="btn btn-primary btn-sm" onClick={() => setAddU(true)}><Plus size={15} /> إضافة مدير</button>}>
          {isCloud
            ? <Notice tone="info" className="mb-4">تُنشأ كلمة مرور عشوائية لكل حساب جديد وتظهر لك مرة واحدة فقط لتسلّمها لصاحبه. "إعادة تعيين" تنشئ كلمة مرور مؤقتة جديدة.</Notice>
            : <Notice tone="info" className="mb-4">كلمة المرور الافتراضية لجميع الحسابات التجريبية <b dir="ltr">{DEMO_PASSWORD}</b>. إعادة التعيين تعيدها إلى هذه القيمة.</Notice>}
          <DataTable rows={db.users} columns={[
            { key: 'n', label: 'المستخدم', render: (u) => <span className="flex items-center gap-3"><Avatar name={u.name} size={32} /><span><b className="block">{u.name}</b><span className="text-xs text-slate" dir="ltr">{u.email}</span></span></span> },
            { key: 'r', label: 'الدور', render: (u) => <Badge tone={u.role === 'admin' ? 'gold' : 'mist'}>{ROLES[u.role]}</Badge> },
            { key: 'a', label: 'الحالة', render: (u) => <Badge tone={u.active ? 'ok' : 'bad'}>{u.active ? 'نشط' : 'معطّل'}</Badge> },
            { key: 'x', label: 'إجراءات', render: (u) => <span className="flex gap-2"><button className="btn btn-outline btn-sm" disabled={u.id === 'u-admin'} onClick={() => { run('toggleUser', u.id); toast(u.active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب') }}>{u.active ? 'تعطيل' : 'تفعيل'}</button><button className="btn btn-ghost btn-sm" onClick={async () => { const r = await resetUserPassword(u.id); if (r.ok === false) toast(r.error || 'تعذر إعادة التعيين', 'bad') }}><KeyRound size={15} /> إعادة تعيين</button></span> },
          ]} />
        </Card>
      )}

      {tab === 'perms' && (
        <Card title="مصفوفة الصلاحيات" ><p className="text-sm text-slate mb-4">الصلاحيات مطبّقة فعليًا في التنقل وفي الوصول إلى الصفحات والبيانات في هذا العرض، وهي للعرض فقط ولا تُعدَّل.</p>
          <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>الصلاحية</th>{Object.values(ROLES).map((r) => <th key={r} className="text-center">{r}</th>)}</tr></thead><tbody>{PERMS.map(([l, v]) => <tr key={l}><td>{l}</td>{v.map((x, i) => <td key={i} className="text-center">{x ? <Check size={18} className="inline text-ok-ink" aria-label="مسموح" /> : <X size={18} className="inline text-hair" aria-label="غير مسموح" />}</td>)}</tr>)}</tbody></table></div></Card>
      )}

      {tab === 'finance' && (
        <form onSubmit={saveFin} className="card card-pad grid sm:grid-cols-2 gap-4 max-w-3xl">
          {err && <Notice tone="bad" className="sm:col-span-2">{err}</Notice>}
          <Field label="العملة" id="f-cur" hint="يغيّر الرمز المعروض فقط، ولا يحوّل القيم."><select id="f-cur" className="select" value={fin.currency} onChange={(e) => setFin({ ...fin, currency: e.target.value })}><option value="EGP">جنيه مصري (EGP)</option><option value="USD">دولار أمريكي (USD)</option></select></Field>
          <Field label="أساس احتساب الساعات" id="f-bill"><select id="f-bill" className="select" value={fin.billing} onChange={(e) => setFin({ ...fin, billing: e.target.value })}><option value="actual">المدة الفعلية للحصة</option><option value="scheduled">المدة المجدولة</option></select></Field>
          <Field label="المدة الافتراضية (دقيقة)" id="f-dd"><input id="f-dd" type="number" className="input" value={fin.defaultDuration} onChange={(e) => setFin({ ...fin, defaultDuration: e.target.value })} /></Field>
          <Field label="المدد السريعة (دقائق)" id="f-du" hint="افصل بينها بفاصلة"><input id="f-du" className="input" value={fin.durations} onChange={(e) => setFin({ ...fin, durations: e.target.value })} /></Field>
          <label className="flex items-start gap-3 sm:col-span-2 cursor-pointer"><input type="checkbox" className="mt-1.5 size-4 accent-[#12385B]" checked={fin.billAbsent} onChange={(e) => setFin({ ...fin, billAbsent: e.target.checked })} /><span><b>احتساب غياب الطالب على الأسرة</b><span className="block text-sm text-slate">إذا فُعّل تُحتسب حصة الغياب بمدتها المجدولة في رسوم الطالب.</span></span></label>
          <label className="flex items-start gap-3 sm:col-span-2 cursor-pointer"><input type="checkbox" className="mt-1.5 size-4 accent-[#12385B]" checked={fin.payTeacherAbsent} onChange={(e) => setFin({ ...fin, payTeacherAbsent: e.target.checked })} /><span><b>دفع أجر المعلم عن حصص الغياب</b><span className="block text-sm text-slate">الحصص المجدولة أو الملغاة أو غير المكتملة لا تُحتسب أبدًا.</span></span></label>
          <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary"><Save size={16} /> حفظ قواعد الفوترة</button></div>
        </form>
      )}

      {tab === 'rates' && (
        <Card title="أسعار الساعة"><p className="text-sm text-slate mb-4">أسعار الطلاب (ما يدفعه الطالب) منفصلة عن أجور المعلمين (ما تدفعه الأكاديمية). يمكن تعديل كل سعر من صفحة <Link to="/app/finance" className="font-bold text-navy underline">المستحقات المالية</Link> مباشرة.</p>
          <div className="grid md:grid-cols-2 gap-6"><div><h3 className="text-base mb-2">أجور المعلمين</h3><ul className="divide-y divide-hair text-sm">{db.teachers.map((t) => <li key={t.id} className="flex justify-between py-2"><span>{t.name}</span><b className="num">{t.rate}</b></li>)}</ul></div>
            <div><h3 className="text-base mb-2">رسوم الطلاب</h3><ul className="divide-y divide-hair text-sm max-h-96 overflow-y-auto">{db.students.map((t) => <li key={t.id} className="flex justify-between py-2"><span>{t.name}</span><b className="num">{t.fee}</b></li>)}</ul></div></div></Card>
      )}

      {tab === 'notifs' && (
        <Card title="تفضيلات الإشعارات" className="max-w-2xl"><ul className="divide-y divide-hair">{NOTIF.map(([k, l]) => <li key={k} className="py-3 flex items-center justify-between"><span className="font-semibold">{l}</span><button role="switch" aria-checked={s.notifPrefs[k]} aria-label={l} onClick={() => save({ notifPrefs: { ...s.notifPrefs, [k]: !s.notifPrefs[k] } })} className={`relative w-12 h-7 rounded-full transition ${s.notifPrefs[k] ? 'bg-ok-ink' : 'bg-hair'}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${s.notifPrefs[k] ? 'start-6' : 'start-1'}`} /></button></li>)}</ul></Card>
      )}

      {tab === 'inbox' && (
        <Card title="الرسائل الواردة من نموذج التواصل">{db.messages.length ? <ul className="divide-y divide-hair">{[...db.messages].reverse().map((m) => <li key={m.id} className="py-3"><div className="flex flex-wrap justify-between gap-2"><b>{m.name}</b><span className="text-xs text-slate">{fmtDateTime(m.at)}</span></div><div className="text-sm text-slate" dir="ltr" style={{ textAlign: 'start' }}>{m.email} • {m.phone}</div><p className="mt-1">{m.message}</p></li>)}</ul> : <Empty title="لا توجد رسائل" text="الرسائل المرسلة من الموقع العام تظهر هنا." />}</Card>
      )}

      {tab === 'data' && (
        isCloud
          ? <Card title="قاعدة البيانات" className="max-w-2xl"><p className="leading-loose">البيانات محفوظة في قاعدة بيانات سحابية (Supabase) مشتركة بين جميع المستخدمين، وكل دور يرى ما يخصه فقط. التعديلات تظهر للآخرين خلال نصف دقيقة تقريبًا. النسخ الاحتياطي من لوحة Supabase.</p></Card>
          : <Card title="البيانات التجريبية" className="max-w-2xl"><p className="leading-loose mb-4">تُحفظ جميع البيانات في متصفحك فقط (localStorage) ولا يوجد خادم أو قاعدة بيانات سحابية. يمكنك إعادة البيانات إلى حالتها الأولى في أي وقت.</p><button className="btn btn-danger" onClick={() => setReset(true)}><RotateCcw size={16} /> إعادة تعيين البيانات التجريبية</button></Card>
      )}

      <Confirm open={reset} onClose={() => setReset(false)} title="إعادة تعيين البيانات" confirmLabel="نعم، أعد التعيين" text="سيتم حذف كل التعديلات والسجلات الجديدة وإعادة البيانات التجريبية الأصلية. لا يمكن التراجع." onConfirm={() => { resetDemo(); setReset(false); toast('تمت إعادة تعيين البيانات'); go('/app/home') }} />
      <Modal open={addU} onClose={() => setAddU(false)} size="sm" title="إضافة مدير جديد" footer={<><button className="btn btn-outline" onClick={() => setAddU(false)}>إلغاء</button><button className="btn btn-primary" onClick={() => { const r = run('addAdminUser', nu); if (r.ok) { toast('تمت إضافة المدير'); setAddU(false); setNu({ name: '', email: '' }) } }}>إضافة</button></>}>
        <div className="flex flex-col gap-4"><Field label="الاسم" required id="nu-n"><input id="nu-n" className="input" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></Field><Field label="البريد الإلكتروني" required id="nu-e"><input id="nu-e" dir="ltr" className="input" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></Field></div>
      </Modal>
    </div>
  )
}
