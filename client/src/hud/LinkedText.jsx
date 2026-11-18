// http(s)://… o www.…; la puntuación final (punto, coma, paréntesis) se queda fuera del enlace
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi
const TRAILING = /[.,;:!?)\]}'"]+$/

/** Texto plano con las URL convertidas en enlaces. React escapa todo lo demás. */
export default function LinkedText({ text }) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(TRAILING, '')
    const start = match.index
    if (start > last) parts.push(text.slice(last, start))
    const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url
    parts.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-amber-300 underline decoration-amber-300/40 underline-offset-2 hover:decoration-amber-300"
      >
        {url}
      </a>,
    )
    last = start + url.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
