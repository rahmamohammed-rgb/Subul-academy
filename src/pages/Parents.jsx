import { useState } from 'react'
import { Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import { PageHeader, Card, SearchBox, Avatar, Badge, Empty, Confirm, toast, money } from '../components/ui'
import { ParentFormModal, run } from '../components/forms'
import { accounts, parentChildren } from '../lib/calc'
import { Link } from '../lib/router'

export default function Parents({ db }) {
  const [q, setQ] = useState('')
  const [form, setForm] = useState(false)
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const acc = accounts(db).students
  const rows = db.parents.filter((p) => !q || `${p.name} ${p.id}`.includes(q.trim()))
  return (
    <div>
      <PageHeader title="أولياء الأمور" sub={`${rows.length} من ${db.parents.length} حسابًا`} actions={<button className="btn btn-primary" onClick={() => setForm(true)}><Plus size={16} /> إضافة ولي أمر</button>} />
      <div className="max-w-md mb-6"><SearchBox value={q} onChange={setQ} placeholder="ابحث باسم ولي الأمر" /></div>
      {rows.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{rows.map((p) => {
        const kids = parentChildren(db, p.id)
        const bal = kids.reduce((t, k) => t + acc[k.id].balance, 0)
        return (
          <article key={p.id} className="card p-5">
            <div className="flex items-center gap-3"><Avatar name={p.name} size={52} /><div className="flex-1 min-w-0"><h3 className="text-lg leading-tight">{p.name}</h3><div className="text-xs text-slate"><span className="num">{p.id}</span> • {p.relation}</div></div></div>
            <div className="text-sm text-slate mt-3 space-y-1"><div className="flex gap-2"><Phone size={15} className="mt-1" /><span dir="ltr">{p.phone}</span></div><div className="flex gap-2"><Mail size={15} className="mt-1" /><span dir="ltr">{p.email}</span></div></div>
            <div className="mt-3 pt-3 border-t border-hair"><div className="text-xs text-slate mb-1.5">الأبناء ({kids.length})</div><div className="flex flex-wrap gap-1.5">{kids.map((k) => <Link key={k.id} to={`/app/students/${k.id}`}><Badge tone="mist">{k.name.split(' ')[0]} - {k.grade}</Badge></Link>)}</div></div>
            <div className="mt-3 flex items-center justify-between"><span className="text-sm">المتبقي: <b className={bal > 0 ? 'text-bad-ink num' : 'text-ok-ink num'}>{money(bal, db.settings)}</b></span><span className="flex gap-1"><button className="btn btn-ghost btn-icon btn-sm" aria-label={`تعديل ${p.name}`} onClick={() => setEdit(p)}><Pencil size={16} /></button><button className="btn btn-ghost btn-icon btn-sm text-bad-ink" aria-label={`حذف ${p.name}`} onClick={() => setDel(p)}><Trash2 size={16} /></button></span></div>
          </article>
        )
      })}</div> : <Empty title="لا يوجد أولياء أمور مطابقون" />}
      <ParentFormModal open={form || !!edit} onClose={() => { setForm(false); setEdit(null) }} parent={edit} />
      <Confirm open={!!del} onClose={() => setDel(null)} title="حذف ولي الأمر" text={`سيتم حذف حساب ${del?.name}. لا يمكن حذف ولي أمر لديه أبناء مسجلون.`} onConfirm={() => { const r = run('deleteParent', del.id); if (r.ok) toast('تم الحذف'); setDel(null) }} />
    </div>
  )
}
