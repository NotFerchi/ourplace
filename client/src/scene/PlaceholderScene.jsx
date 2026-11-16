import Base from './Base'
import Cabin from './Cabin'
import { FirePit } from './Campfire'
import Couple, { LogBench } from './Couple'
import Forest from './Forest'
import { LanternPost } from './parts'
import Stairs from './Stairs'
import Waterfall from './Waterfall'
import { CABIN, FIRE, LOGS } from './world'

/**
 * Escena placeholder en estilo PS2: campamento a la orilla de un lago, con
 * cabaña, claro con fogata, acantilado, cascada, escalera y muelle. Todo es
 * geometría y texturas generadas en código, mientras no exista
 * /public/models/my-place.glb.
 */
export default function PlaceholderScene({ night }) {
  return (
    <group>
      <Base night={night} />
      <Forest />
      <Cabin night={night} position={CABIN.position} rotation={[0, CABIN.rotation, 0]} />

      {/* Claro: solo la fogata y los troncos, el resto queda libre */}
      <FirePit night={night} position={FIRE} />
      {LOGS.map((log, i) =>
        log.couple ? (
          <Couple key={i} position={log.position} rotation={[0, log.rotation, 0]} />
        ) : (
          <LogBench key={i} position={log.position} rotation={[0, log.rotation, 0]} />
        ),
      )}

      <Waterfall night={night} />
      <Stairs night={night} />

      {/* Faroles del sendero y del fondo del claro */}
      <LanternPost night={night} position={[-4.9, 0, 3.95]} light />
      <LanternPost night={night} position={[-2.6, 0, 2.35]} />
      <LanternPost night={night} position={[-0.2, 0, 3.75]} light />
      <LanternPost night={night} position={[1.6, 0, 2.5]} />
      <LanternPost night={night} position={[1.3, 0, -4.6]} light />
      <LanternPost night={night} position={[6.2, 0, -2.6]} />
    </group>
  )
}
