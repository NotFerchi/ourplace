const pad = (n) => String(n).padStart(2, '0')

export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
export const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes())

const timeFmt = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
const longDateFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDateFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

export const fmtTime = (d) => timeFmt.format(d)
export const fmtLongDate = (d) => longDateFmt.format(d)
export const fmtShortDate = (d) => shortDateFmt.format(d)

/** Valor compatible con <input type="datetime-local"> en hora local. */
export const toLocalInputValue = (d) =>
  `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`

export const timeStrToMin = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}
export const minToTimeStr = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`

export const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes()

export function greetingFor(d) {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buenos días'
  if (h >= 12 && h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
