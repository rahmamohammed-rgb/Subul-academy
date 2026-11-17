import { todayISO, addDays, parseISO, toMin, fromMin, pad, nowHHMM } from './dates'
import { computeAccounts as accounts } from './calc'

export const DEMO_PASSWORD = 'demo1234'
export const DB_VERSION = 3

export const SUBJECTS = [
  { id: 'math', name: 'الرياضيات', color: '#2F6DB5' },
  { id: 'phys', name: 'الفيزياء', color: '#7B5EA7' },
  { id: 'chem', name: 'الكيمياء', color: '#C2563B' },
  { id: 'arab', name: 'اللغة العربية', color: '#1F8A70' },
  { id: 'eng', name: 'اللغة الإنجليزية', color: '#B8861F' },
  { id: 'shar', name: 'العلوم الشرعية', color: '#8A6D3B' },
  { id: 'quran', name: 'حفظ القرآن الكريم', color: '#23966A' },
  { id: 'sci', name: 'العلوم', color: '#0E8FA8' },
]

export const GRADES = ['الصف الخامس الابتدائي', 'الصف السادس الابتدائي', 'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي', 'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي']

export const DEFAULT_SETTINGS = {
  academyName: 'أكاديمية سُبُل',
  englishName: 'Subul Academy',
  tagline: 'معًا نصنع مستقبلًا أفضل',
  subTagline: 'لكل طالب طريق إلى النجاح',
  phone: '+20 100 555 0142',
  email: 'info@subul-academy.demo',
  address: 'القاهرة - مدينة نصر، شارع مصطفى النحاس',
  logo: null,
  currency: 'EGP',
  billing: 'actual',
  billAbsent: false,
  payTeacherAbsent: false,
  defaultDuration: 60,
  durations: [45, 60, 90, 120],
  notifPrefs: { lessonReminders: true, completions: true, absences: true, reports: true, payments: true },
}

const TEACHERS = [
  ['محمود عبد الرحمن', 'm', ['math', 'phys'], 15, 130, 'معلم رياضيات وفيزياء بخبرة طويلة في إعداد طلاب المرحلة الثانوية، يتميز بتبسيط المفاهيم المعقدة وربطها بالتطبيقات الواقعية.', 'بكالوريوس العلوم - قسم الرياضيات، دبلومة تربوية'],
  ['سلمى الجندي', 'f', ['chem', 'sci'], 11, 120, 'متخصصة في الكيمياء والعلوم، تعتمد على التجارب المصورة والأسئلة التفاعلية لبناء فهم عميق ودائم.', 'ماجستير الكيمياء العضوية، جامعة عين شمس'],
  ['هدى الشريف', 'f', ['arab', 'shar'], 13, 110, 'معلمة لغة عربية وعلوم شرعية، تعمل على تقوية مهارات القراءة والتعبير وتأصيل القيم لدى الطلاب.', 'ليسانس دار العلوم، جامعة القاهرة'],
  ['يوسف مصطفى', 'm', ['eng'], 9, 125, 'مدرس لغة إنجليزية حاصل على شهادة IELTS بدرجة 8، يركز على المحادثة والكتابة الأكاديمية.', 'بكالوريوس الآداب - اللغة الإنجليزية، IELTS 8.0'],
  ['عمر الحسيني', 'm', ['quran', 'shar'], 18, 115, 'محفّظ قرآن مجاز بالسند، يدرّس أحكام التجويد وحفظ القرآن الكريم بأسلوب هادئ يناسب جميع الأعمار.', 'إجازة في رواية حفص عن عاصم، خريج الأزهر الشريف'],
  ['نورا فتحي', 'f', ['math', 'sci'], 7, 100, 'معلمة رياضيات وعلوم للمرحلتين الابتدائية والإعدادية، تحوّل الأرقام إلى ألعاب ذهنية ممتعة.', 'بكالوريوس التربية - شعبة الرياضيات'],
  ['كريم السيد', 'm', ['phys', 'chem'], 10, 135, 'مدرس فيزياء وكيمياء للثانوية العامة، متمرس في حل المسائل وتحليل نماذج الامتحانات.', 'بكالوريوس العلوم - فيزياء وكيمياء'],
  ['ريم عبد الله', 'f', ['eng', 'arab'], 8, 105, 'معلمة لغتين، تدمج بين مهارات الإنجليزية والعربية لتقوية التواصل والكتابة.', 'ليسانس الألسن - قسم اللغة الإنجليزية'],
  ['طارق منصور', 'm', ['math', 'eng'], 6, 95, 'معلم رياضيات وإنجليزية للمرحلة الإعدادية، يهتم بمتابعة الواجبات والتقييم الدوري.', 'بكالوريوس التجارة، دبلومة التدريس الحديث'],
]

const FAMILIES = [
  ['أحمد الشناوي', [['آدم', 'm', 6], ['ملك', 'f', 3], ['يحيى', 'm', 1]]],
  ['منى الحداد', [['لينا', 'f', 5], ['سليم', 'm', 2]]],
  ['خالد البنا', [['عمر', 'm', 7], ['جنى', 'f', 4], ['زياد', 'm', 0]]],
  ['سعاد العطار', [['رنا', 'f', 6], ['مازن', 'm', 3]]],
  ['محمد النجار', [['مريم', 'f', 2], ['ياسين', 'm', 5], ['حمزة', 'm', 1]]],
  ['هالة فؤاد', [['سارة', 'f', 4], ['كريم', 'm', 0]]],
  ['إبراهيم الخطيب', [['نور', 'f', 7], ['بسمة', 'f', 3], ['أنس', 'm', 2]]],
  ['ليلى مرسي', [['جودي', 'f', 1], ['تامر', 'm', 5], ['هنا', 'f', 0]]],
  ['عادل زيدان', [['سيف', 'm', 6], ['روان', 'f', 4]]],
  ['نجلاء السبكي', [['فارس', 'm', 7], ['دانا', 'f', 3], ['مصطفى', 'm', 1]]],
]

const TIER = [['math', 'arab', 'eng', 'sci', 'quran'], ['math', 'sci', 'arab', 'eng', 'shar'], ['math', 'phys', 'chem', 'arab', 'eng']]
const tierOf = (g) => (g < 2 ? 0 : g < 5 ? 1 : 2)

const SUMMARY = {
  math: ['شرحنا قواعد حل المعادلات وطبّق الطالب أمثلة متدرجة بنجاح.', 'راجعنا الدرس السابق وحللنا مجموعة مسائل على الهندسة والمساحات.', 'تدرّب الطالب على التحليل والنسب مع تحسن واضح في السرعة.'],
  phys: ['ناقشنا قوانين الحركة وربطناها بتجارب من الحياة اليومية.', 'حللنا مسائل الشغل والطاقة مع التركيز على وحدات القياس.', 'راجعنا الدوائر الكهربائية وحل نماذج امتحانات سابقة.'],
  chem: ['راجعنا الجدول الدوري وخواص العناصر مع أمثلة تطبيقية.', 'تدرّب الطالب على موازنة المعادلات الكيميائية.', 'شرحنا الروابط الكيميائية وأنواعها مع رسوم توضيحية.'],
  arab: ['تدرّب الطالب على الإعراب وقراءة نص أدبي مع تحليل الأفكار.', 'عملنا على مهارات التعبير الكتابي وتصحيح الأخطاء الإملائية.', 'راجعنا قواعد النحو الأساسية وحللنا نصوصًا قصيرة.'],
  eng: ['تدرّبنا على المحادثة وتوسيع المفردات مع قراءة نص قصير.', 'راجعنا الأزمنة النحوية وكتب الطالب فقرة تعبيرية.', 'تدرّب الطالب على الاستماع وحل تمارين القواعد.'],
  shar: ['شرحنا أحكام الصلاة وآدابها مع أمثلة من السيرة.', 'تناولنا درسًا في الأخلاق والمعاملات وناقشنا مواقف عملية.', 'راجعنا الأحاديث المقررة وفهم معانيها.'],
  quran: ['تلاوة وتجويد مع مراجعة ما سبق حفظه وتسميع جديد.', 'حفظ مقطع جديد وتصحيح مخارج الحروف.', 'مراجعة الحفظ السابق وتطبيق أحكام النون الساكنة والتنوين.'],
  sci: ['استعرضنا دورة الماء وتجربة مبسطة لتوضيح التبخر والتكاثف.', 'تعرّف الطالب على أجهزة جسم الإنسان وحل أسئلة تفاعلية.', 'ناقشنا مفهوم المادة وحالاتها مع أنشطة تطبيقية.'],
}
const HW = {
  math: ['حل تمارين الدرس من 1 إلى 10', 'مراجعة 5 مسائل كلامية', 'ورقة عمل: المعادلات والمتباينات'],
  phys: ['حل مسائل الكتاب ص 45', 'تلخيص قوانين الدرس في بطاقة', 'نموذج امتحان قصير'],
  chem: ['موازنة 10 معادلات كيميائية', 'تلخيص خواص المجموعات', 'حل أسئلة نهاية الوحدة'],
  arab: ['كتابة موضوع تعبير من 10 أسطر', 'إعراب الجمل المحددة', 'حفظ أبيات القصيدة المقررة'],
  eng: ['كتابة فقرة عن الإجازة الصيفية', 'حفظ 15 كلمة جديدة', 'تمارين القواعد ص 30'],
  shar: ['حفظ الحديث المقرر', 'تلخيص الدرس في نقاط', 'الإجابة عن أسئلة الدرس'],
  quran: ['مراجعة الحفظ الجديد 3 مرات', 'تسميع الصفحة المقررة', 'تدريب على أحكام التجويد'],
  sci: ['رسم تخطيطي لدورة الماء', 'حل أسئلة الوحدة', 'بحث مصغّر عن موضوع الدرس'],
}
const FEEDBACK = ['طالب مجتهد ومنتظم، ويُظهر تحسنًا ملحوظًا في المشاركة.', 'مستوى جيد جدًا مع حاجة لمزيد من التدريب على التفاصيل.', 'يحتاج إلى تركيز أكبر في الواجبات المنزلية وسنتابع ذلك.', 'أداء ممتاز هذا الأسبوع، ننصح بالاستمرار على نفس الوتيرة.', 'تفاعل رائع خلال الحصة وفهم سريع للمفاهيم الجديدة.']
const METHODS = ['نقدًا', 'تحويل بنكي', 'فودافون كاش', 'بطاقة بنكية']

function rngFactory(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildSeed() {
  const rnd = rngFactory(20261021)
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
  const today = todayISO()
  const nowM = toMin(nowHHMM())
  let seq = 5000
  const nid = (p) => `${p}-${++seq}`

  const db = {
    version: DB_VERSION,
    meta: { seededAt: new Date().toISOString(), seq: 5000 },
    settings: structuredClone(DEFAULT_SETTINGS),
    subjects: SUBJECTS,
    users: [{ id: 'u-admin', role: 'admin', name: 'د. عبد الله السيد', username: 'admin', email: 'admin@subul.demo', password: DEMO_PASSWORD, refId: null, active: true }],
    teachers: [], students: [], parents: [],
    lessons: [], homework: [], reports: [], assessments: [], payments: [], notifications: [], messages: [],
  }

  TEACHERS.forEach((t, i) => {
    const id = `T-${1001 + i}`
    db.teachers.push({ id, name: t[0], gender: t[1], subjects: t[2], experience: t[3], rate: t[4], bio: t[5], qualifications: t[6], phone: `+20 10${pad(10 + i)} 55${pad(20 + i)}${i}`, email: `teacher${i + 1}@subul.demo`, status: 'active' })
    db.users.push({ id: `u-${id}`, role: 'teacher', name: t[0], username: `teacher${i + 1}`, email: `teacher${i + 1}@subul.demo`, password: DEMO_PASSWORD, refId: id, active: true })
  })

  const load = {}
  const pickTeacher = (sub) => {
    const c = db.teachers.filter((t) => t.subjects.includes(sub))
    c.sort((a, b) => (load[a.id] || 0) - (load[b.id] || 0))
    load[c[0].id] = (load[c[0].id] || 0) + 1
    return c[0].id
  }
  let si = 0
  FAMILIES.forEach(([pname, kids], pi) => {
    const pid = `P-${3001 + pi}`
    const surname = pname.split(' ').slice(1).join(' ')
    db.parents.push({ id: pid, name: pname, phone: `+20 11${pad(20 + pi)} 4${pad(40 + pi)}${pi}`, email: `parent${pi + 1}@subul.demo`, relation: pi % 3 === 1 ? 'الأم' : 'الأب' })
    db.users.push({ id: `u-${pid}`, role: 'parent', name: pname, username: `parent${pi + 1}`, email: `parent${pi + 1}@subul.demo`, password: DEMO_PASSWORD, refId: pid, active: true })
    kids.forEach(([first, gender, g]) => {
      const sid = `S-${2001 + si}`
      const subs = TIER[tierOf(g)]
      const n = si % 4 === 0 ? 3 : 2
      const chosen = Array.from({ length: n }, (_, k) => subs[(si + k * 2) % subs.length])
      const uniq = [...new Set(chosen)]
      const fee = [140, 170, 210][tierOf(g)] + (si % 3) * 10
      db.students.push({
        id: sid, name: `${first} ${surname}`, gender, grade: GRADES[g], parentId: pid, fee, status: 'active',
        joined: addDays(today, -(120 + si * 7)), notes: '', assignments: uniq.map((subjectId) => ({ subjectId, teacherId: pickTeacher(subjectId) })),
      })
      db.users.push({ id: `u-${sid}`, role: 'student', name: `${first} ${surname}`, username: `student${si + 1}`, email: `student${si + 1}@subul.demo`, password: DEMO_PASSWORD, refId: sid, active: true })
      si++
    })
  })

  // weekly slots
  const DOWS = [6, 0, 1, 2, 3, 4]
  const busy = new Set()
  const slots = []
  db.students.forEach((s) => {
    s.assignments.forEach((a) => {
      const dur = pick([60, 60, 60, 60, 90, 45, 60])
      const span = dur === 90 ? 2 : 1
      for (let tries = 0; tries < 300; tries++) {
        const dow = pick(DOWS)
        const h = 14 + Math.floor(rnd() * (span === 2 ? 6 : 7))
        const keys = []
        for (let k = 0; k < span; k++) keys.push(`T${a.teacherId}|${dow}|${h + k}`, `S${s.id}|${dow}|${h + k}`)
        if (keys.some((k) => busy.has(k))) continue
        keys.forEach((k) => busy.add(k))
        slots.push({ student: s, a, dow, h, dur })
        break
      }
    })
  })

  const from = addDays(today, -56)
  const to = addDays(today, 14)
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const dow = parseISO(d).getDay()
    slots.filter((x) => x.dow === dow).forEach((x) => {
      const start = fromMin(x.h * 60)
      const end = fromMin(x.h * 60 + x.dur)
      let status = 'upcoming'
      const r = rnd()
      if (d < today) status = r < 0.84 ? 'completed' : r < 0.92 ? 'cancelled' : 'absent'
      else if (d === today) status = x.h * 60 + x.dur < nowM ? 'completed' : 'upcoming'
      const l = {
        id: nid('L'), teacherId: x.a.teacherId, studentId: x.student.id, subjectId: x.a.subjectId, date: d, start, end,
        type: rnd() < 0.35 ? 'online' : 'inperson', status, notes: '', attendance: null, actualStart: null, actualEnd: null, actualMinutes: null, summary: '', homework: '', perfNote: '',
      }
      if (status === 'completed') {
        const late = rnd() < 0.12
        const adj = rnd() < 0.1 ? pick([-15, 15]) : 0
        const as = x.h * 60 + (late ? 10 : 0)
        l.attendance = late ? 'late' : 'present'
        l.actualStart = fromMin(as)
        l.actualEnd = fromMin(as + x.dur + adj - (late ? 10 : 0))
        l.actualMinutes = x.dur + adj - (late ? 10 : 0)
        l.summary = pick(SUMMARY[x.a.subjectId])
        l.homework = pick(HW[x.a.subjectId])
        l.perfNote = pick(FEEDBACK)
        l.recordedAt = `${d}T${l.end}:00`
      } else if (status === 'absent') {
        l.attendance = 'absent'
        l.actualMinutes = 0
        l.notes = 'لم يحضر الطالب ولم يتم الإبلاغ مسبقًا.'
        l.recordedAt = `${d}T${l.end}:00`
      } else if (status === 'cancelled') {
        l.notes = 'أُلغيت الحصة بناءً على طلب ولي الأمر.'
      }
      db.lessons.push(l)
    })
  }
  db.meta.seq = seq

  // assessments, homework, reports
  db.students.forEach((s, i) => {
    s.assignments.forEach((a, k) => {
      const base = 62 + ((i * 7 + k * 11) % 24)
      for (let n = 0; n < 4; n++) {
        db.assessments.push({ id: nid('A'), studentId: s.id, subjectId: a.subjectId, title: n === 3 ? 'اختبار شهري' : `اختبار قصير ${n + 1}`, score: Math.min(100, base + n * 3 + Math.floor(rnd() * 8)), max: 100, date: addDays(today, -49 + n * 14) })
      }
    })
    const done = db.lessons.filter((l) => l.studentId === s.id && l.status === 'completed').sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
    done.slice(0, 4).forEach((l, n) => {
      const due = addDays(l.date, 3)
      db.homework.push({ id: nid('H'), studentId: s.id, teacherId: l.teacherId, subjectId: l.subjectId, lessonId: l.id, title: l.homework, dueDate: due, createdAt: l.date, status: due < today ? (rnd() < 0.8 ? 'reviewed' : 'pending') : n === 0 && rnd() < 0.3 ? 'submitted' : 'pending' })
    })
    done.slice(0, 2).forEach((l, n) => {
      db.reports.push({ id: nid('R'), studentId: s.id, teacherId: l.teacherId, subjectId: l.subjectId, date: l.date, rating: 3 + Math.floor(rnd() * 3), text: l.perfNote, lessonId: l.id })
    })
  })

  // payments from seeded accounts
  const acc = accounts(db)
  db.students.forEach((s, i) => {
    const a = acc.students[s.id]
    const pct = [1, 0.75, 0.5, 0.6, 1, 0.3, 0.85][i % 7]
    let amt = Math.round((a.charges * pct) / 10) * 10
    const parts = amt > 600 ? 2 : 1
    for (let k = 0; k < parts && amt > 0; k++) {
      const v = k === parts - 1 ? amt : Math.round(amt / 2 / 10) * 10
      amt -= v
      db.payments.push({ id: nid('PAY'), type: 'student', refId: s.id, amount: v, date: addDays(today, -(30 - k * 14 - (i % 5))), method: METHODS[(i + k) % 4], note: '', createdAt: new Date().toISOString() })
    }
  })
  db.teachers.forEach((t, i) => {
    const a = acc.teachers[t.id]
    const amt = Math.round((a.earnings * (i % 3 === 0 ? 1 : 0.7)) / 10) * 10
    if (amt > 0) db.payments.push({ id: nid('PAY'), type: 'teacher', refId: t.id, amount: amt, date: addDays(today, -(4 + i)), method: i % 2 ? 'تحويل بنكي' : 'نقدًا', note: 'دفعة شهرية', createdAt: new Date().toISOString() })
  })

  // notifications
  const acc2 = accounts(db)
  const N = []
  const note = (userIds, kind, title, body, at, link, read) => N.push({ id: nid('N'), userIds, kind, title, body, at, link, readBy: read ? userIds : [] })
  const par = (s) => `u-${s.parentId}`
  const sn = (id) => db.students.find((x) => x.id === id)
  const sub = (id) => SUBJECTS.find((x) => x.id === id).name
  const recentDone = db.lessons.filter((l) => l.status === 'completed' && l.date <= today).sort((a, b) => (b.date + b.end).localeCompare(a.date + a.end))
  recentDone.slice(0, 5).forEach((l, i) => note(['u-admin'], 'completed', 'اكتملت حصة', `${sn(l.studentId).name} - ${sub(l.subjectId)} (${l.actualMinutes} دقيقة)`, `${l.date}T${l.end}:00`, { type: 'lesson', id: l.id }, i > 1))
  db.lessons.filter((l) => l.status === 'absent').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).forEach((l, i) => {
    const s = sn(l.studentId)
    note(['u-admin', `u-${l.teacherId}`], 'absent', 'غياب طالب', `${s.name} لم يحضر حصة ${sub(l.subjectId)}`, `${l.date}T${l.end}:00`, { type: 'lesson', id: l.id }, i > 0)
    note([par(s)], 'absent', 'تم تسجيل غياب', `لم يحضر ${s.name} حصة ${sub(l.subjectId)} بتاريخ ${l.date}`, `${l.date}T${l.end}:00`, { type: 'lesson', id: l.id }, i > 0)
  })
  db.students.forEach((s, i) => {
    const mine = db.lessons.filter((l) => l.studentId === s.id)
    const last = mine.filter((l) => l.status === 'completed').sort((a, b) => (b.date + b.end).localeCompare(a.date + a.end))[0]
    const next = mine.filter((l) => l.status === 'upcoming' && l.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
    if (last) {
      note([`u-${s.id}`, par(s)], 'report', 'تقرير حصة جديد', `ملخص حصة ${sub(last.subjectId)}: ${last.summary}`, `${last.date}T${last.end}:00`, { type: 'student', id: s.id }, i % 3 === 0)
      const hw = db.homework.find((h) => h.lessonId === last.id)
      if (hw) note([`u-${s.id}`, par(s)], 'homework', 'واجب جديد', `${hw.title} - تسليم ${hw.dueDate}`, `${last.date}T${last.end}:00`, { type: 'student', id: s.id }, i % 2 === 0)
    }
    if (next) note([`u-${s.id}`, par(s), `u-${next.teacherId}`], 'upcoming', 'حصة قادمة', `${sub(next.subjectId)} مع ${sn(next.studentId).name} يوم ${next.date} الساعة ${next.start}`, new Date().toISOString(), { type: 'lesson', id: next.id }, false)
    if (acc2.students[s.id].balance > 150 && i % 2 === 0) note([par(s)], 'reminder', 'تذكير بالمستحقات', `المتبقي على ${s.name}: ${acc2.students[s.id].balance} ج.م`, new Date(Date.now() - 86400000).toISOString(), { type: 'payment', id: s.id }, false)
  })
  db.payments.slice(0, 40).filter((p) => p.type === 'student').slice(-4).forEach((p, i) => {
    const s = sn(p.refId)
    note(['u-admin', par(s)], 'payment', 'تم تسجيل دفعة', `${p.amount} ج.م - ${s.name} (${p.method})`, `${p.date}T10:30:00`, { type: 'payment', id: p.id }, i < 2)
  })
  db.teachers.forEach((t, i) => {
    const p = db.payments.find((x) => x.type === 'teacher' && x.refId === t.id)
    if (p) note([`u-${t.id}`], 'payment', 'تم تحويل مستحقات', `${p.amount} ج.م (${p.method})`, `${p.date}T12:00:00`, { type: 'payment', id: p.id }, i % 2 === 0)
  })
  db.notifications = N
  db.meta.seq = seq
  return db
}
