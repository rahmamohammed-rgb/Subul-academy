import { useState, useEffect } from 'react'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import Logo from './Logo'
import { Avatar } from './ui'
import { Link } from '../lib/router'
import { fmtDateFull, todayISO } from '../lib/dates'

const ROLE = { admin: 'الإدارة', teacher: 'معلم', student: 'طالب', parent: 'ولي أمر' }

export default function Shell({ user, settings, nav, page, unread, onLogout, children }) {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [page])
  const current = nav.find((n) => n.id === page)
  return (
    <div className="min-h-screen bg-cream lg:ps-72">
      {open && <div className="fixed inset-0 z-40 bg-navy-deep/60 lg:hidden no-print" onClick={() => setOpen(false)} />}
      <aside className={`no-print fixed inset-y-0 start-0 z-50 w-[17.5rem] lg:w-72 bg-navy-deep pattern flex flex-col px-5 py-5 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`} aria-label="القائمة الرئيسية">
        <div className="flex items-center justify-between pb-5 mb-4 border-b border-white/10">
          <Link to="/"><Logo settings={settings} light /></Link>
          <button className="lg:hidden text-white btn btn-icon btn-ghost hover:!bg-white/10" onClick={() => setOpen(false)} aria-label="إغلاق القائمة"><X /></button>
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto flex-1 -mx-1 px-1">
          {nav.map((n) => (
            <Link key={n.id} to={`/app/${n.id}`} className="nav-link" aria-current={page === n.id ? 'page' : undefined}>
              <n.icon size={20} className={page === n.id ? 'text-gold' : ''} />
              <span className="flex-1">{n.label}</span>
              {n.id === 'notifications' && unread > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-gold text-navy-deep text-xs font-extrabold inline-flex items-center justify-center">{unread}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={user.name} size={42} />
            <div className="min-w-0">
              <div className="text-white font-bold text-sm truncate">{user.name}</div>
              <div className="text-gold text-xs font-bold">{ROLE[user.role]}</div>
            </div>
          </div>
          <button onClick={onLogout} className="nav-link !text-[#ffd0cd] hover:!bg-white/10"><LogOut size={19} /> تسجيل الخروج</button>
        </div>
      </aside>

      <header className="topbar no-print sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-hair">
        <div className="flex items-center gap-3 px-4 md:px-8 h-16">
          <button className="lg:hidden btn btn-outline btn-icon" onClick={() => setOpen(true)} aria-label="فتح القائمة"><Menu size={20} /></button>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-navy-deep truncate">{current?.label}</div>
            <div className="text-xs text-slate hidden sm:block">{fmtDateFull(todayISO())}</div>
          </div>
          <Link to="/app/notifications" className="btn btn-outline btn-icon relative" aria-label={`الإشعارات${unread ? ` (${unread} غير مقروء)` : ''}`}>
            <Bell size={20} />
            {unread > 0 && <span className="absolute -top-1.5 -end-1.5 min-w-5 h-5 px-1 rounded-full bg-bad-ink text-white text-[.7rem] font-extrabold inline-flex items-center justify-center">{unread}</span>}
          </Link>
          <Link to="/" className="btn btn-ghost btn-sm hidden md:inline-flex">الموقع</Link>
        </div>
      </header>
      <main className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px] print-area">{children}</main>
    </div>
  )
}
