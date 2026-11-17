import { useEffect, useState } from 'react'
import { Copy, KeyRound } from 'lucide-react'
import { Modal, Notice, toast } from './ui'

// Shows the login details the Edge Function just generated. The passwords are not stored anywhere readable,
// so this dialog is the only chance to copy them.
export default function Credentials() {
  const [list, setList] = useState(null)
  useEffect(() => {
    const f = (e) => setList(e.detail)
    window.addEventListener('subul:credentials', f)
    return () => window.removeEventListener('subul:credentials', f)
  }, [])
  const text = (list || []).map((c) => `${c.name}\nاسم المستخدم: ${c.username}\nكلمة المرور: ${c.password}`).join('\n\n')
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('تم النسخ') } catch { toast('تعذر النسخ تلقائيًا، حدّد النص وانسخه يدويًا', 'bad') }
  }
  return (
    <Modal open={!!list?.length} onClose={() => setList(null)} size="sm" title="بيانات الدخول الجديدة"
      footer={<><button className="btn btn-outline" onClick={copy}><Copy size={16} /> نسخ الكل</button><button className="btn btn-primary" onClick={() => setList(null)}>تم الحفظ</button></>}>
      <Notice tone="warn" className="mb-4">احفظ هذه البيانات الآن وسلّمها لصاحب الحساب. لن تظهر كلمة المرور مرة أخرى، ويمكنك دائمًا إعادة تعيينها من الإعدادات.</Notice>
      <ul className="flex flex-col gap-3">
        {(list || []).map((c) => (
          <li key={c.username} className="rounded-xl border border-hair bg-mist p-3">
            <div className="font-extrabold flex items-center gap-2"><KeyRound size={16} className="text-gold-ink" /> {c.name}</div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate">اسم المستخدم</dt><dd dir="ltr" className="font-bold text-start select-all">{c.username}</dd>
              <dt className="text-slate">كلمة المرور</dt><dd dir="ltr" className="font-bold text-start select-all">{c.password}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
