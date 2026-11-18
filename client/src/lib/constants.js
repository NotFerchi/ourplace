import { BookOpen, Code, Dumbbell, GraduationCap, Heart, Rocket, Shapes } from 'lucide-react'

// Las claves coinciden con los enums de server/prisma/schema.prisma
export const CATEGORIES = {
  ESCUELA: { label: 'Escuela', color: '#7cc4ff', icon: GraduationCap },
  PROYECTO: { label: 'Proyecto', color: '#c3a6ff', icon: Rocket },
  PERSONAL: { label: 'Personal', color: '#8fd19e', icon: Heart },
}

export const PRIORITIES = {
  ALTA: { label: 'Alta', color: '#ff8370', weight: 0 },
  MEDIA: { label: 'Media', color: '#ffb454', weight: 1 },
  BAJA: { label: 'Baja', color: '#9db3ad', weight: 2 },
}

// Origen de las tareas importadas (enum Source del schema); MANUAL no lleva chip
export const SOURCES = {
  CLICKUP: { label: 'ClickUp', color: '#c3a6ff' },
  CLASSROOM: { label: 'Classroom', color: '#8fd19e' },
  TEAMS: { label: 'Teams', color: '#7cc4ff' },
}

export const BLOCK_TYPES = {
  CLASE: { label: 'Clase', color: '#7cc4ff', icon: GraduationCap },
  ESTUDIO: { label: 'Estudio', color: '#ffb454', icon: BookOpen },
  GYM: { label: 'Gym', color: '#ff8370', icon: Dumbbell },
  DESARROLLO: { label: 'Desarrollo', color: '#c3a6ff', icon: Code },
  OTRO: { label: 'Otro', color: '#8fd19e', icon: Shapes },
}
