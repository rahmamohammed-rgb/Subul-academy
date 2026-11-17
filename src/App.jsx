import { useEffect, useState, useCallback } from 'react'
import { LayoutDashboard, Users, GraduationCap, UserRound, CalendarDays, ClipboardCheck, Wallet, BarChart3, Bell, Settings as Cog, LineChart, BookOpenCheck, ShieldAlert } from 'lucide-react'
import { useRoute, go, Link } from './lib/router'
import { useDb, useStatus, getInitError, init, getSession, logout } from './lib/store'
import { notificationsFor } from './lib/calc'
import { Toaster, Empty, toast } from './components/ui'
import Credentials from './components/Credentials'
import Shell from './components/Shell'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminHome from './pages/AdminHome'
import Teachers from './pages/Teachers'
import Students from './pages/Students'
import StudentProfile from './pages/StudentProfile'
import Parents from './pages/Parents'
import Schedule from './pages/Schedule'
import Record from './pages/Record'
import Finance from './pages/Finance'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import { TeacherHome, StudentHome, ParentHome, ChildView } from './pages/RoleHomes'

const I = (id, label, icon) => ({ id, label, icon })
const NAV = {
  admin: [I('home', 'الرئيسية', LayoutDashboard), I('teachers', 'المعلمون', UserRound), I('students', 'الطلاب', GraduationCap), I('parents', 'أولياء الأمور', Users), I('schedule', 'جدول الحصص', CalendarDays), I('record', 'تسجيل الحصص', ClipboardCheck), I('finance', 'المستحقات المالية', Wallet), I('reports', 'التقارير', BarChart3), I('notifications', 'الإشعارات', Bell), I('settings', 'الإعدادات', Cog)],
  teacher: [I('home', 'الرئيسية', LayoutDashboard), I('students', 'طلابي', GraduationCap), I('schedule', 'جدول الحصص', CalendarDays), I('record', 'تسجيل الحصص', ClipboardCheck), I('notifications', 'الإشعارات', Bell)],
  student: [I('home', 'الرئيسية', LayoutDashboard), I('schedule', 'جدولي الدراسي', CalendarDays), I('progress', 'مستواي الدراسي', LineChart), I('homework', 'الواجبات', BookOpenCheck), I('notifications', 'الإشعارات', Bell)],
  parent: [I('home', 'الرئيسية', LayoutDashboard), I('schedule', 'الجدول والحضور', CalendarDays), I('progress', 'المستوى والتقارير', LineChart), I('payments', 'المدفوعات', Wallet), I('notifications', 'الإشعارات', Bell)],
}

function Denied() {
  return (
    <div className="max-w-xl mx-auto mt-10"><Empty icon={ShieldAlert} title="غير مصرّح لك بعرض هذه الصفحة" text="هذه الصفحة غير متاحة لحسابك. يمكنك العودة إلى لوحتك الرئيسية." action={<Link to="/app/home" className="btn btn-primary">العودة للرئيسية</Link>} /></div>
  )
}

function canSeeStudent(db, user, sid) {
  const s = db.students.find((x) => x.id === sid)
  if (!s) return false
  if (user.role === 'admin') return true
  if (user.role === 'teacher') return s.assignments.some((a) => a.teacherId === user.refId)
  if (user.role === 'parent') return s.parentId === user.refId
  return s.id === user.refId
}

function Splash({ error }) {
  return (
    <div className="min-h-screen grid place-items-center bg-cream p-6 text-center">
      {error ? (
        <div className="max-w-md">
          <ShieldAlert size={40} className="mx-auto text-bad-ink" />
          <h1 className="text-2xl mt-3">تعذر تشغيل المنصة</h1>
          <p className="text-slate mt-2" dir="auto">{error}</p>
          <button className="btn btn-primary mt-5" onClick={() => init()}>إعادة المحاولة</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
          <span className="size-10 rounded-full border-4 border-hair border-t-gold animate-spin" />
          <span className="font-bold text-navy">جارٍ التحميل…</span>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const status = useStatus()
  const db = useDb()
  const { path, params } = useRoute()
  const [, setTick] = useState(0)
  useEffect(() => { init() }, [])
  useEffect(() => {
    const f = (e) => toast(e.detail || 'تعذر حفظ التغييرات', 'bad')
    window.addEventListener('subul:error', f)
    return () => window.removeEventListener('subul:error', f)
  }, [])
  const session = getSession()
  const user = session ? db.users.find((u) => u.id === session.userId && u.active) : null
  useEffect(() => { if (db.settings) document.title = `${db.settings.academyName} | ${db.settings.tagline}` }, [db.settings])
  const onLogout = useCallback(() => { logout(); setTick((t) => t + 1); go('/login') }, [])
  const seg = path.split('/').filter(Boolean)
  const isApp = seg[0] === 'app'

  useEffect(() => { if (!isApp) window.scrollTo(0, 0) }, [path])
  useEffect(() => { if (isApp) window.scrollTo(0, 0) }, [seg[1], seg[2]])

  useEffect(() => {
    if (isApp && !user) go('/login')
  }, [isApp, user])

  let body
  if (status !== 'ready') return <Splash error={status === 'error' ? getInitError() : ''} />
  if (seg[0] === 'login') body = <Login onDone={() => setTick((t) => t + 1)} />
  else if (!isApp) body = <Home />
  else if (!user) body = null
  else {
    const nav = NAV[user.role]
    const page = seg[1] || 'home'
    const id = seg[2]
    const allowed = nav.some((n) => n.id === page) || (page === 'students' && user.role !== 'student')
    const unread = notificationsFor(db, user.id).filter((n) => !n.readBy.includes(user.id)).length
    const p = { db, user }
    let content
    if (!allowed) content = <Denied />
    else if (page === 'home') content = { admin: <AdminHome {...p} />, teacher: <TeacherHome {...p} />, student: <StudentHome {...p} />, parent: <ParentHome {...p} /> }[user.role]
    else if (page === 'teachers') content = user.role === 'admin' ? <Teachers {...p} id={id} /> : <Denied />
    else if (page === 'students') content = id ? (canSeeStudent(db, user, id) ? <StudentProfile {...p} id={id} backTo="/app/students" /> : <Denied />) : <Students {...p} />
    else if (page === 'parents') content = user.role === 'admin' ? <Parents {...p} /> : <Denied />
    else if (page === 'schedule') content = <Schedule {...p} params={params} />
    else if (page === 'record') content = ['admin', 'teacher'].includes(user.role) ? <Record {...p} params={params} /> : <Denied />
    else if (page === 'finance') content = user.role === 'admin' ? <Finance {...p} /> : <Denied />
    else if (page === 'reports') content = user.role === 'admin' ? <Reports {...p} /> : <Denied />
    else if (page === 'notifications') content = <Notifications {...p} />
    else if (page === 'settings') content = user.role === 'admin' ? <Settings {...p} /> : <Denied />
    else if (['progress', 'homework', 'payments'].includes(page)) content = <ChildView {...p} kind={page} />
    else content = <Denied />
    body = (
      <Shell user={user} settings={db.settings} nav={nav} page={page} unread={unread} onLogout={onLogout}>
        {content}
      </Shell>
    )
  }
  return (<>{body}<Credentials /><Toaster /></>)
}
