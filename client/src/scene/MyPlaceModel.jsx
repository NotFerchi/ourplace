import { Component, useEffect, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { CONFIG } from '../config'

/**
 * Carga tu modelo de Blender (GLB) y reproduce sus animaciones.
 * - Si hay clips cuyo nombre contenga "Idle", reproduce todos en bucle.
 * - Si no, reproduce el primer clip disponible.
 * Actívalo en src/config.js → model.enabled = true
 */
export default function MyPlaceModel() {
  const { url, position, rotation, scale } = CONFIG.model
  const group = useRef()
  const { scene, animations } = useGLTF(url)
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
  }, [scene])

  useEffect(() => {
    const idle = names.filter((n) => /idle/i.test(n))
    const toPlay = idle.length ? idle : names.slice(0, 1)
    toPlay.forEach((n) => actions[n]?.reset().fadeIn(0.6).play())
    return () => toPlay.forEach((n) => actions[n]?.fadeOut(0.3))
  }, [actions, names])

  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

/** Si el GLB no existe o está dañado, muestra el `fallback` en lugar de romper la app. */
export class ModelBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn(`[My Place] No se pudo cargar ${CONFIG.model.url}; usando la escena placeholder.`, error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
