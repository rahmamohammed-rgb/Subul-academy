import logoMark from '../assets/logo-mark.png'

export default function Logo({ settings, size = 44, light = false, showText = true }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="rounded-full bg-white overflow-hidden shrink-0 ring-2 ring-gold/70" style={{ width: size, height: size }}>
        <img src={settings?.logo || logoMark} alt="شعار أكاديمية سُبُل" className="h-full w-full object-contain" />
      </span>
      {showText && (
        <span className="leading-tight text-start">
          <span className={`block font-extrabold text-xl ${light ? 'text-white' : 'text-navy-deep'}`}>{settings?.academyName || 'أكاديمية سُبُل'}</span>
          <span className={`block text-[.68rem] font-bold tracking-[.22em] ${light ? 'text-gold' : 'text-gold-ink'}`} dir="ltr">SUBUL ACADEMY</span>
        </span>
      )}
    </span>
  )
}
