import { useEffect, useState } from 'react'

const parse = () => {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, qs] = raw.split('?')
  return { path: path || '/', params: Object.fromEntries(new URLSearchParams(qs || '')) }
}
export function useRoute() {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const f = () => setR(parse())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return r
}
export const go = (to) => {
  window.location.hash = to
}
export const Link = ({ to, children, ...p }) => (
  <a href={'#' + to} {...p}>
    {children}
  </a>
)
