import { Clock, Video, MapPin, Pencil, Ban, ClipboardCheck, User, GraduationCap } from 'lucide-react'
import { Modal, StatusBadge, Badge, LESSON_TYPE, ATTENDANCE, Notice } from './ui'
import { getTeacher, getStudent, getSubject, lessonMinutes } from '../lib/calc'
import { fmtTime, fmtDate, hoursLabel } from '../lib/dates'

export function LessonCard({ l, db, onClick, showStudent = true, showTeacher = true, compact = false }) {
  const sub = getSubject(db, l.subjectId)
  const cancelled = l.status === 'cancelled'
  return (
    <button onClick={() => onClick?.(l)} className={`w-full text-start rounded-xl bg-white border border-hair hover:shadow-card hover:-translate-y-px transition ${compact ? 'p-2.5' : 'p-3.5'} ${cancelled ? 'opacity-70' : ''}`} style={{ borderInlineStartWidth: 5, borderInlineStartColor: sub?.color }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-extrabold text-navy-deep ${cancelled ? 'line-through' : ''} ${compact ? 'text-[.82rem]' : ''}`}>{sub?.name}</div>
          <div className="text-xs text-slate mt-0.5 flex items-center gap-1"><Clock size={13} /> <span className="num">{fmtTime(l.start)}</span> - <span className="num">{fmtTime(l.end)}</span></div>
        </div>
        {!compact && <StatusBadge status={l.status} />}
      </div>
      {!compact && (
        <div className="text-xs text-slate mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {showStudent && <span className="inline-flex items-center gap-1"><GraduationCap size={13} /> {getStudent(db, l.studentId)?.name}</span>}
          {showTeacher && <span className="inline-flex items-center gap-1"><User size={13} /> {getTeacher(db, l.teacherId)?.name}</span>}
          <span className="inline-flex items-center gap-1">{l.type === 'online' ? <Video size={13} /> : <MapPin size={13} />} {LESSON_TYPE[l.type]}</span>
        </div>
      )}
      {compact && <div className="mt-1.5"><StatusBadge status={l.status} /></div>}
    </button>
  )
}

export function LessonDetail({ l, db, onClose, actions }) {
  if (!l) return null
  const sub = getSubject(db, l.subjectId)
  const row = (k, v) => (
    <div className="flex justify-between gap-4 py-2 border-b border-hair last:border-0">
      <span className="text-slate text-sm">{k}</span>
      <span className="font-semibold text-end">{v}</span>
    </div>
  )
  return (
    <Modal open onClose={onClose} title="تفاصيل الحصة" footer={actions}>
      <div className="flex items-center gap-3 mb-4">
        <span className="h-12 w-1.5 rounded" style={{ background: sub?.color }} />
        <div>
          <div className="text-xl font-extrabold text-navy-deep">{sub?.name}</div>
          <StatusBadge status={l.status} />
        </div>
      </div>
      {row('التاريخ', fmtDate(l.date))}
      {row('الموعد المجدول', <span><span className="num">{fmtTime(l.start)}</span> - <span className="num">{fmtTime(l.end)}</span> ({hoursLabel(lessonMinutes(l))})</span>)}
      {row('المعلم', getTeacher(db, l.teacherId)?.name)}
      {row('الطالب', getStudent(db, l.studentId)?.name)}
      {row('نوع الحصة', LESSON_TYPE[l.type])}
      {l.attendance && row('الحضور', ATTENDANCE[l.attendance])}
      {['completed', 'incomplete'].includes(l.status) && row('الوقت الفعلي', <span><span className="num">{fmtTime(l.actualStart)}</span> - <span className="num">{fmtTime(l.actualEnd)}</span> ({l.actualMinutes} دقيقة)</span>)}
      {l.summary && (
        <div className="mt-4"><div className="text-sm font-bold text-navy mb-1">ملخص الحصة</div><p className="bg-mist rounded-xl p-3 text-sm leading-relaxed">{l.summary}</p></div>
      )}
      {l.homework && (
        <div className="mt-3"><div className="text-sm font-bold text-navy mb-1">الواجب / الخطوات القادمة</div><p className="bg-[#fdf6e6] rounded-xl p-3 text-sm leading-relaxed">{l.homework}</p></div>
      )}
      {l.perfNote && (
        <div className="mt-3"><div className="text-sm font-bold text-navy mb-1">ملاحظات الأداء</div><p className="text-sm leading-relaxed text-slate">{l.perfNote}</p></div>
      )}
      {l.notes && <Notice tone="info" className="mt-3">{l.notes}</Notice>}
      {l.status === 'upcoming' && <Badge tone="gray" className="mt-4">لا تُحتسب الحصة المجدولة كحصة منفّذة إلا بعد تسجيلها</Badge>}
    </Modal>
  )
}

export const lessonActionIcons = { Pencil, Ban, ClipboardCheck }
