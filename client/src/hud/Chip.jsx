/** Opción tipo píldora (categoría, prioridad, fecha, día de la semana). */
export default function Chip({ active, color, onClick, children, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8rem] transition-colors"
      style={
        active
          ? { borderColor: color, background: `${color}33`, color: '#fff' }
          : { borderColor: 'rgb(255 255 255 / 0.18)', color: 'rgb(255 255 255 / 0.75)' }
      }
    >
      {children}
    </button>
  )
}
