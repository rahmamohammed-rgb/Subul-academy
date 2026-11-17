export const pad = (n) => String(n).padStart(2, '0')
export const fmtISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => fmtISO(new Date())
export const nowHHMM = () => {
  const n = new Date()
  return `${pad(n.getHours())}:${pad(n.getMinutes())}`
}
export const addDays = (s, n) => {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return fmtISO(d)
}
export const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000)
// Week starts on Saturday
export const weekStart = (s) => addDays(s, -((parseISO(s).getDay() + 1) % 7))
export const monthStart = (s) => s.slice(0, 8) + '01'
export const monthKey = (s) => s.slice(0, 7)
export const addMonths = (s, n) => {
  const d = parseISO(monthStart(s))
  d.setMonth(d.getMonth() + n)
  return fmtISO(d)
}
export const daysInMonth = (s) => {
  const d = parseISO(s)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}
const L = 'ar-EG-u-nu-latn'
export const fmtDay = (s) => parseISO(s).toLocaleDateString(L, { weekday: 'long' })
export const fmtDate = (s) => parseISO(s).toLocaleDateString(L, { weekday: 'long', day: 'numeric', month: 'long' })
export const fmtDateShort = (s) => parseISO(s).toLocaleDateString(L, { day: 'numeric', month: 'short' })
export const fmtDateFull = (s) => parseISO(s).toLocaleDateString(L, { day: 'numeric', month: 'long', year: 'numeric' })
export const fmtMonth = (s) => parseISO(s.length === 7 ? s + '-01' : s).toLocaleDateString(L, { month: 'long', year: 'numeric' })
export const fmtMonthShort = (s) => parseISO(s.length === 7 ? s + '-01' : s).toLocaleDateString(L, { month: 'short' })
export const fmtDateTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString(L, { day: 'numeric', month: 'short' }) + ' - ' + fmtTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
}
export const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
export const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`
export const fmtTime = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'م' : 'ص'}`
}
export const hoursLabel = (min) => {
  const h = Math.round((min / 60) * 100) / 100
  return `${h} ساعة`
}
export const relativeDay = (s) => {
  const d = diffDays(s, todayISO())
  if (d === 0) return 'اليوم'
  if (d === 1) return 'غدًا'
  if (d === -1) return 'أمس'
  return fmtDate(s)
}
export const WEEK_DAYS = [6, 0, 1, 2, 3, 4, 5] // Sat..Fri as JS getDay values
export const DAY_NAMES = { 6: 'السبت', 0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة' }
