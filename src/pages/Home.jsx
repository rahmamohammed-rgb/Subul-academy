import { useState } from 'react'
import { Calculator, Atom, FlaskConical, BookText, Languages, MoonStar, BookOpen, Microscope, UserRound, LineChart, CalendarCheck, FileText, GraduationCap, Heart, ShieldCheck, Users, Phone, Mail, MapPin, ChevronDown, Menu, X, Quote, CheckCircle2, ArrowLeft, Wallet, ClipboardList, Sparkles } from 'lucide-react'
import Logo from '../components/Logo'
import { Avatar, Field, toast } from '../components/ui'
import { useDb, submitMessage, isCloud } from '../lib/store'
import { Link } from '../lib/router'
import { accounts, totals } from '../lib/calc'
import banner from '../assets/banner.png'
import books from '../assets/books.png'

const NAV = [['home', 'الرئيسية'], ['about', 'من نحن'], ['teachers', 'المعلمون'], ['subjects', 'المواد الدراسية'], ['services', 'خدماتنا'], ['parents', 'أولياء الأمور'], ['contact', 'تواصل معنا']]
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const SUBJECT_ICONS = { math: Calculator, phys: Atom, chem: FlaskConical, arab: BookText, eng: Languages, shar: MoonStar, quran: BookOpen, sci: Microscope }
const IMG_TUTOR = 'https://images.unsplash.com/photo-1758685733985-695e588224d5?w=1000&h=760&fit=crop&auto=format'
const IMG_STUDY = 'https://images.unsplash.com/photo-1598981457915-aea220950616?w=1000&h=760&fit=crop&auto=format'

function Section({ id, eyebrow, title, sub, children, tone = 'cream', className = '' }) {
  const bg = { cream: 'bg-cream', white: 'bg-white', navy: 'bg-navy-deep text-white pattern', mist: 'bg-mist' }[tone]
  return (
    <section id={id} className={`${bg} py-16 md:py-24 scroll-mt-16 ${className}`}>
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        {(title || eyebrow) && (
          <div className="max-w-2xl mb-10 md:mb-14">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className={`text-3xl md:text-[2.5rem] mt-1 ${tone === 'navy' ? '!text-white' : ''}`}>{title}</h2>
            <div className="rule-gold mt-4" />
            {sub && <p className={`mt-4 text-lg leading-relaxed ${tone === 'navy' ? 'text-[#c9d6e6]' : 'text-slate'}`}>{sub}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

export default function Home() {
  const db = useDb()
  const s = db.settings
  const [menu, setMenu] = useState(false)
  const t = totals(db)
  const completed = db.lessons.filter((l) => l.status === 'completed').length
  const stats = db.publicStats || { students: db.students.length, teachers: db.teachers.length, lessons: completed, hours: Math.round(t.studentHours) }
  const nav = (id) => { setMenu(false); scrollTo(id) }
  return (
    <div className="bg-cream">
      <header className="sticky top-0 z-50 bg-navy-deep border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between gap-4">
          <button onClick={() => nav('home')} aria-label="الرئيسية"><Logo settings={s} light /></button>
          <nav className="hidden lg:flex items-center gap-1" aria-label="التنقل الرئيسي">
            {NAV.map(([id, label]) => <button key={id} onClick={() => nav(id)} className="px-3 py-2 rounded-lg text-[.92rem] font-semibold text-[#d5e0ee] hover:text-white hover:bg-white/10 transition">{label}</button>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn btn-gold btn-sm">تسجيل الدخول</Link>
            <button className="lg:hidden btn btn-icon btn-ghost !text-white hover:!bg-white/10" onClick={() => setMenu(!menu)} aria-label="القائمة" aria-expanded={menu}>{menu ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menu && <div className="lg:hidden border-t border-white/10 px-5 py-3 flex flex-col">{NAV.map(([id, label]) => <button key={id} onClick={() => nav(id)} className="text-start py-3 text-white font-semibold border-b border-white/5">{label}</button>)}</div>}
      </header>

      {/* HERO */}
      <section id="home" className="relative bg-navy-deep pattern overflow-hidden scroll-mt-16">
        <div className="absolute -start-40 -top-40 size-[34rem] rounded-full bg-navy opacity-60 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8 pt-14 pb-20 md:pt-24 md:pb-28 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div className="rise">
            <div className="eyebrow !text-gold text-2xl">{s.subTagline}</div>
            <h1 className="text-5xl md:text-7xl !text-white leading-[1.15] mt-3">
              معًا نصنع <br /> <span className="text-gold">مستقبلًا</span> أفضل
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#d0dcea] leading-loose max-w-xl">رحلتك التعليمية تبدأ مع سُبُل، حيث تجد التعليم المتميز والمتابعة المستمرة وطريقًا أوضح نحو النجاح.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => scrollTo('contact')} className="btn btn-gold !min-h-[52px] !px-7 text-base">ابدأ رحلتك معنا <ArrowLeft size={18} /></button>
              <Link to="/login" className="btn !min-h-[52px] !px-7 text-base border-white/40 text-white hover:bg-white/10">بوابة الدخول</Link>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-4 max-w-lg border-t border-white/15 pt-6">
              {[[stats.students, 'طالب مسجّل'], [stats.teachers, 'معلم متخصص'], [stats.lessons, 'حصة منفّذة']].map(([n, l]) => (
                <div key={l}><dd className="text-3xl md:text-4xl font-extrabold text-gold num">{n}</dd><dt className="text-sm text-[#b9c8da]">{l}</dt></div>
              ))}
            </dl>
          </div>
          <div className="relative mx-auto w-full max-w-md rise" style={{ animationDelay: '.15s' }}>
            <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-t-[12rem] rounded-b-3xl border-2 border-gold/60" aria-hidden />
            <div className="relative rounded-t-[12rem] rounded-b-3xl overflow-hidden bg-[#f4efe3] aspect-[4/5]">
              <img src={books} alt="كتب الرياضيات والفيزياء والكيمياء مع كرة أرضية" className="h-full w-full object-cover object-center" />
            </div>
            <div className="absolute -bottom-5 -start-4 md:-start-10 card px-4 py-3 flex items-center gap-3 !rounded-2xl">
              <span className="size-11 rounded-xl bg-navy text-gold inline-flex items-center justify-center"><LineChart size={22} /></span>
              <div><div className="text-xs text-slate font-semibold">متابعة تقدّم الطالب</div><div className="font-extrabold text-navy-deep">تقارير بعد كل حصة</div></div>
            </div>
          </div>
        </div>
        <div className="h-2 bg-gold" />
      </section>

      {/* ABOUT */}
      <Section id="about" eyebrow="من نحن" title="أكاديمية تؤمن أن لكل طالب طريقًا إلى النجاح" sub="سُبُل أكاديمية تعليمية متخصصة في شرح جميع المواد الدراسية بأسلوب فردي يراعي قدرات كل طالب، مع متابعة منتظمة تُطمئن الأسرة.">
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          <div className="rounded-3xl overflow-hidden shadow-card border border-hair bg-white">
            <img src={banner} alt="غلاف أكاديمية سُبُل - تعليم متميز لبناء مستقبل أفضل" className="w-full h-full object-cover min-h-[220px]" />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {[[GraduationCap, 'رؤيتنا', 'أن نكون الخيار الأول للأسر الباحثة عن تعليم فردي متميز تُقاس نتائجه بوضوح.'], [Heart, 'رسالتنا', 'نقدّم دروسًا فردية ودعمًا أكاديميًا ومتابعة مستمرة، ونبني شراكة حقيقية مع كل أسرة.'], [ShieldCheck, 'قيمنا', 'الأمانة، الإتقان، الاحترام، وغرس حب التعلّم والقيم الأصيلة لدى الطلاب.'], [Users, 'التزامنا', 'متابعة تقدّم الطالب وتواصل شفاف مع ولي الأمر عبر تقارير وإشعارات دورية.']].map(([I, h, p]) => (
              <div key={h} className="card p-5 hover:-translate-y-1 transition">
                <span className="size-11 rounded-xl bg-navy text-gold inline-flex items-center justify-center mb-3"><I size={22} /></span>
                <h3 className="text-lg mb-1.5">{h}</h3><p className="text-slate leading-relaxed text-[.95rem]">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* SERVICES */}
      <Section id="services" tone="white" eyebrow="خدماتنا" title="خدمات تعليمية متكاملة" sub="من الحصة الأولى وحتى قياس النتيجة، نوفّر منظومة واضحة تُدار بالكامل عبر المنصة.">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[[UserRound, 'دروس فردية', 'حصص خاصة حضورية أو عن بُعد، مصمَّمة حول احتياج الطالب وسرعته.'], [GraduationCap, 'دعم أكاديمي', 'مراجعات، حل نماذج امتحانات، وتقوية نقاط الضعف في المواد المختلفة.'], [LineChart, 'متابعة دورية للتقدّم', 'اختبارات قصيرة ودرجات وتحليل لتطور المستوى في كل مادة.'], [CalendarCheck, 'جدولة ومتابعة الحصص', 'مواعيد منظمة وتنبيهات بالتغييرات وسجل حضور دقيق.'], [FileText, 'تقارير تعليمية', 'ملخص بعد كل حصة وتقارير أداء يطّلع عليها الطالب وولي الأمر.'], [Wallet, 'حسابات شفافة', 'ساعات منفّذة ومستحقات ومدفوعات واضحة بلا مفاجآت.']].map(([I, h, p], i) => (
            <div key={h} className="group rounded-2xl border border-hair bg-cream p-6 hover:bg-navy-deep transition-colors duration-300">
              <div className="flex items-center justify-between mb-5"><span className="size-12 rounded-xl bg-white text-navy inline-flex items-center justify-center shadow-sm group-hover:bg-gold group-hover:text-navy-deep transition"><I size={24} /></span><span className="text-4xl font-extrabold text-hair group-hover:text-white/15 num">0{i + 1}</span></div>
              <h3 className="text-xl mb-2 group-hover:!text-white">{h}</h3><p className="text-slate group-hover:text-[#c9d6e6] leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* SUBJECTS */}
      <Section id="subjects" eyebrow="المواد الدراسية" title="كل ما يحتاجه الطالب في مكان واحد">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {db.subjects.map((x) => {
            const I = SUBJECT_ICONS[x.id]
            const n = db.teachers.filter((tt) => tt.subjects.includes(x.id)).length
            return (
              <div key={x.id} className="card p-5 text-center hover:-translate-y-1 hover:shadow-pop transition">
                <span className="size-14 rounded-2xl inline-flex items-center justify-center text-white mb-3" style={{ background: x.color }}><I size={28} /></span>
                <div className="font-extrabold text-navy-deep">{x.name}</div>
                <div className="text-xs text-slate mt-1">{n} معلمين</div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* TEACHERS */}
      <Section id="teachers" tone="white" eyebrow="المعلمون" title="نخبة من المعلمين المتخصصين" sub="معلمون أكفاء يجمعون بين التمكّن العلمي والصبر وحسن التواصل.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {db.teachers.slice(0, 8).map((tt) => (
            <article key={tt.id} className="rounded-2xl border border-hair bg-cream overflow-hidden group">
              <div className="h-24 bg-navy-deep pattern relative"><div className="absolute -bottom-9 start-5"><Avatar name={tt.name} size={76} className="!ring-4 !ring-cream" /></div></div>
              <div className="pt-11 px-5 pb-5">
                <h3 className="text-lg">{tt.name}</h3>
                <div className="text-gold-ink font-bold text-sm">{tt.subjects.map((x) => db.subjects.find((y) => y.id === x).name).join(' • ')}</div>
                <div className="text-xs text-slate mt-1">{tt.experience} سنة خبرة</div>
                <p className="text-sm text-slate leading-relaxed mt-3 line-clamp-3">{tt.bio}</p>
                <div className="text-xs font-semibold text-navy mt-3 pt-3 border-t border-hair">{tt.qualifications}</div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* WHY */}
      <Section tone="navy" eyebrow="لماذا سُبُل" title="ثلاث فئات.. تجربة واحدة مطمئنة">
        <div className="grid md:grid-cols-3 gap-6">
          {[['للطلاب', GraduationCap, ['اهتمام فردي وخطة تناسب مستواك', 'واجبات واضحة وتغذية راجعة سريعة', 'مواعيد مرنة حضوريًا أو عن بُعد']], ['للمعلمين', UserRound, ['جدول منظم وتسجيل بسيط للحصص', 'مستحقات تُحتسب تلقائيًا وبشفافية', 'متابعة الطلاب وتقاريرهم في مكان واحد']], ['لأولياء الأمور', Heart, ['اطمئنان بمتابعة الحضور والتقدّم', 'تقارير بعد كل حصة وإشعارات فورية', 'رسوم ومدفوعات واضحة لكل ابن']]].map(([h, I, list]) => (
            <div key={h} className="rounded-2xl border border-white/15 bg-white/5 p-7">
              <span className="size-12 rounded-xl bg-gold text-navy-deep inline-flex items-center justify-center mb-4"><I size={24} /></span>
              <h3 className="text-2xl !text-white mb-4">{h}</h3>
              <ul className="space-y-3">{list.map((x) => <li key={x} className="flex gap-2.5 text-[#d5e0ee]"><CheckCircle2 size={20} className="text-gold shrink-0 mt-1" />{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </Section>

      {/* PARENTS */}
      <Section id="parents" eyebrow="أولياء الأمور" title="طمأنينة تبدأ من لوحة واحدة" sub="بوابة خاصة بولي الأمر تعرض كل ما يخص أبناءه فقط، بدون تعقيد.">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="grid sm:grid-cols-2 gap-4 order-2 lg:order-1">
            {[[ClipboardList, 'الحضور', 'سجل حضور وغياب كل حصة'], [CalendarCheck, 'الجدول', 'مواعيد الحصص القادمة وتغييراتها'], [LineChart, 'التقدّم الدراسي', 'درجات ومخططات تطور المستوى'], [FileText, 'التقارير', 'ملخص كل حصة وملاحظات المعلم'], [Wallet, 'المدفوعات', 'الرسوم والمدفوعات والرصيد المتبقي'], [Sparkles, 'عدة أبناء', 'تنقّل بين الأبناء بضغطة واحدة']].map(([I, h, p]) => (
              <div key={h} className="card p-4 flex gap-3"><span className="size-10 shrink-0 rounded-lg bg-mist text-navy inline-flex items-center justify-center"><I size={20} /></span><div><div className="font-extrabold text-navy-deep">{h}</div><div className="text-sm text-slate">{p}</div></div></div>
            ))}
            <Link to="/login" className="btn btn-primary sm:col-span-2">ادخل إلى بوابة ولي الأمر</Link>
          </div>
          <div className="order-1 lg:order-2 relative"><img src={IMG_STUDY} alt="طالب يكتب على مكتبه أثناء الدراسة" className="rounded-3xl w-full aspect-[4/3] object-cover bg-mist shadow-card" /><div className="absolute -bottom-4 -end-3 md:-end-6 card px-5 py-3 !rounded-2xl"><div className="text-xs text-slate font-semibold">إجمالي الساعات المنفّذة</div><div className="text-2xl font-extrabold text-navy-deep num">{stats.hours} ساعة</div></div></div>
        </div>
      </Section>

      {/* HOW */}
      <Section tone="white" eyebrow="كيف نعمل" title="خمس خطوات إلى رحلة تعليمية ناجحة">
        <ol className="grid md:grid-cols-5 gap-4 relative">
          {[['التسجيل', 'سجّل بيانات الطالب ومستواه ومواده.'], ['تعيين المعلم', 'نختار المعلم الأنسب لكل مادة.'], ['جدولة الحصص', 'نحدد المواعيد المناسبة للأسرة.'], ['التعلّم', 'حصص فردية يعقبها ملخص وواجب.'], ['متابعة التقدّم', 'تقارير ودرجات وحسابات شفافة.']].map(([h, p], i) => (
            <li key={h} className="relative rounded-2xl border border-hair bg-cream p-5">
              <span className="size-11 rounded-full bg-navy text-gold font-extrabold inline-flex items-center justify-center mb-3 num ring-4 ring-[#e3edf8]">{i + 1}</span>
              <h3 className="text-lg mb-1">{h}</h3><p className="text-sm text-slate leading-relaxed">{p}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid md:grid-cols-[1fr_1.2fr] gap-8 items-center rounded-3xl bg-cream border border-hair overflow-hidden">
          <img src={IMG_TUTOR} alt="معلم يشرح درس الرياضيات لطالب على مكتب" className="h-full w-full object-cover min-h-[240px] bg-mist" />
          <div className="p-7 md:p-10"><div className="eyebrow">دقة في التفاصيل</div><h3 className="text-2xl md:text-3xl mt-1 mb-3">كل حصة تُسجَّل، وكل ساعة تُحتسب بعدل</h3><p className="text-slate leading-loose">لا تُحتسب الحصة المجدولة إلا بعد تنفيذها وتسجيلها. الغياب والإلغاء لا يُحمَّلان على الأسرة افتراضيًا، والحسابات تُحدَّث لحظيًا مع كل حصة ودفعة.</p></div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      {!isCloud && (<Section tone="mist" eyebrow="آراء أسرنا" title="ماذا يقولون عن سُبُل">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[['ولي أمر - أحمد الشناوي', 'أصبحت أعرف يوميًا ماذا درس أبنائي وكيف يتقدمون. التقارير بعد كل حصة غيّرت الكثير.'], ['طالبة - رنا العطار', 'المعلمون يبسّطون الفيزياء بطريقة رائعة، وصرت أحل المسائل بثقة قبل الامتحان.'], ['ولية أمر - منى الحداد', 'الجدول والمدفوعات واضحة تمامًا، ولا أحتاج للاتصال لأعرف أي شيء.'], ['طالب - عمر البنا', 'حفظت جزءًا جديدًا هذا الشهر بفضل المتابعة المنتظمة وتشجيع الشيخ عمر.']].map(([n, q]) => (
            <figure key={n} className="card p-6 flex flex-col"><Quote className="text-gold mb-3" size={28} /><blockquote className="leading-loose flex-1">{q}</blockquote><figcaption className="mt-5 pt-4 border-t border-hair flex items-center gap-3"><Avatar name={n.split(' - ')[1]} size={38} /><span className="font-bold text-sm text-navy-deep">{n}</span></figcaption></figure>
          ))}
        </div>
        <p className="text-xs text-slate mt-4">* الآراء والأسماء خيالية لأغراض العرض التجريبي.</p>
      </Section>)}

      <Faq />
      <Contact s={s} />

      <footer className="bg-navy-deep pattern text-[#c9d6e6]">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-14 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1"><Logo settings={s} light /><p className="mt-4 text-sm leading-loose">{s.tagline}. {s.subTagline}.</p></div>
          <div><h4 className="!text-white mb-3">التنقل</h4><ul className="space-y-2 text-sm">{NAV.map(([id, l]) => <li key={id}><button onClick={() => scrollTo(id)} className="hover:text-gold">{l}</button></li>)}</ul></div>
          <div><h4 className="!text-white mb-3">خدماتنا</h4><ul className="space-y-2 text-sm"><li>دروس فردية</li><li>دعم أكاديمي</li><li>متابعة التقدّم</li><li>جدولة الحصص</li><li>التقارير التعليمية</li></ul></div>
          <div><h4 className="!text-white mb-3">الأكاديمية</h4><ul className="space-y-2 text-sm">{s.phone && <li className="flex gap-2"><Phone size={16} className="text-gold mt-1" /><span dir="ltr">{s.phone}</span></li>}{s.email && <li className="flex gap-2"><Mail size={16} className="text-gold mt-1" />{s.email}</li>}{s.address && <li className="flex gap-2"><MapPin size={16} className="text-gold mt-1" />{s.address}</li>}</ul></div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} {s.academyName} {isCloud ? '- جميع الحقوق محفوظة' : '- جميع البيانات في هذا العرض تجريبية وخيالية'}</div>
      </footer>
    </div>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  const items = [['كيف أسجّل ابني في الأكاديمية؟', 'تواصل معنا عبر نموذج الاتصال، وسيتواصل معك فريقنا لتحديد المستوى والمواد وتعيين المعلم المناسب.'], ['هل الحصص حضورية أم عن بُعد؟', 'نوفّر الخيارين، ويُحدَّد نوع كل حصة عند جدولتها حسب رغبة الأسرة.'], ['متى تُحتسب الحصة في الرسوم؟', 'عند تنفيذها وتسجيلها كمكتملة فقط، وبحسب مدتها الفعلية. الحصص الملغاة أو الغياب لا تُحتسب افتراضيًا.'], ['كيف أتابع تقدّم أبنائي؟', 'عبر بوابة ولي الأمر: الحضور، الجدول، التقارير، الدرجات، المدفوعات، مع التنقل بين الأبناء.'], ['كيف تُسدَّد الرسوم؟', 'يمكن السداد نقدًا أو بالتحويل أو المحافظ الإلكترونية، وتظهر كل دفعة فورًا في السجل والرصيد.']]
  return (
    <Section id="faq" tone="white" eyebrow="أسئلة شائعة" title="إجابات سريعة">
      <div className="max-w-3xl divide-y divide-hair border-y border-hair">
        {items.map(([q, a], i) => (
          <div key={q}>
            <button className="w-full flex items-center justify-between gap-4 py-5 text-start font-extrabold text-navy-deep text-lg" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{q}<ChevronDown className={`shrink-0 text-gold-ink transition ${open === i ? 'rotate-180' : ''}`} /></button>
            {open === i && <p className="pb-5 text-slate leading-loose">{a}</p>}
          </div>
        ))}
      </div>
    </Section>
  )
}

function Contact({ s }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', message: '' })
  const [e, setE] = useState({})
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (ev) => {
    ev.preventDefault()
    if (busy) return
    const er = {}
    if (f.name.trim().length < 3) er.name = 'أدخل اسمك الكامل (3 أحرف على الأقل)'
    if (!/^[+\d][\d\s-]{7,16}$/.test(f.phone.trim())) er.phone = 'أدخل رقم هاتف صحيحًا'
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) er.email = 'أدخل بريدًا إلكترونيًا صحيحًا'
    if (f.message.trim().length < 10) er.message = 'اكتب رسالتك (10 أحرف على الأقل)'
    setE(er)
    if (Object.keys(er).length) return
    setBusy(true)
    const r = await submitMessage(f)
    setBusy(false)
    if (r?.ok === false) return toast(r.error || 'تعذر إرسال الرسالة، حاول مرة أخرى', 'bad')
    setSent(true)
    setF({ name: '', phone: '', email: '', message: '' })
    toast(isCloud ? 'تم استلام رسالتك بنجاح' : 'تم استلام رسالتك بنجاح (عرض تجريبي)')
  }
  const inp = (k, label, props = {}) => (
    <Field label={label} required error={e[k]} id={`c-${k}`}>
      <input id={`c-${k}`} className="input" value={f[k]} aria-invalid={!!e[k]} onChange={(ev) => setF({ ...f, [k]: ev.target.value })} {...props} />
    </Field>
  )
  return (
    <Section id="contact" eyebrow="تواصل معنا" title="يسعدنا أن نسمع منك">
      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8">
        <div className="rounded-3xl bg-navy-deep pattern text-white p-8 md:p-10 flex flex-col gap-6">
          <h3 className="!text-white text-2xl">بيانات التواصل</h3>
          {[[Phone, 'الهاتف', s.phone, true], [Mail, 'البريد', s.email, true], [MapPin, 'العنوان', s.address, false]].filter((r) => r[2]).map(([I, l, v, ltr]) => (
            <div key={l} className="flex gap-4 items-start"><span className="size-11 rounded-xl bg-white/10 text-gold inline-flex items-center justify-center shrink-0"><I size={20} /></span><div><div className="text-sm text-[#b9c8da]">{l}</div><div className="font-bold" dir={ltr ? 'ltr' : undefined}>{v}</div></div></div>
          ))}
          {!isCloud && <p className="text-sm text-[#b9c8da] border-t border-white/15 pt-5 mt-auto">بيانات تواصل خيالية للعرض التجريبي. الرسائل تُحفظ في متصفحك فقط ولا تُرسل إلى أي جهة.</p>}
        </div>
        <form onSubmit={submit} noValidate className="card card-pad grid sm:grid-cols-2 gap-4">
          {inp('name', 'الاسم الكامل')}
          {inp('phone', 'رقم الهاتف', { dir: 'ltr', placeholder: '+20 ...' })}
          <div className="sm:col-span-2">{inp('email', 'البريد الإلكتروني', { dir: 'ltr', type: 'email' })}</div>
          <Field label="رسالتك" required error={e.message} id="c-message" className="sm:col-span-2"><textarea id="c-message" className="textarea" value={f.message} aria-invalid={!!e.message} onChange={(ev) => setF({ ...f, message: ev.target.value })} placeholder="أخبرنا بالمرحلة الدراسية والمواد المطلوبة..." /></Field>
          {sent && <div className="sm:col-span-2 rounded-xl bg-[#e6f5ee] text-ok-ink font-bold p-3 flex gap-2 items-center"><CheckCircle2 size={20} /> شكرًا لك! سنتواصل معك قريبًا.</div>}
          <button className="btn btn-primary sm:col-span-2 !min-h-[50px]" disabled={busy}>{busy ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}</button>
        </form>
      </div>
    </Section>
  )
}
