import { useEffect, useMemo } from 'react'
import { BackSide, Color } from 'three'

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// "bottom" es el color del horizonte (el mismo que la niebla) y "top" el del cielo alto.
const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  varying vec3 vDir;
  void main() {
    float t = smoothstep(-0.3, 0.25, vDir.y);
    gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Fondo en degradado vertical que cambia con la hora. */
export function SkyDome({ top, bottom }) {
  const uniforms = useMemo(() => ({ uTop: { value: new Color() }, uBottom: { value: new Color() } }), [])

  useEffect(() => {
    uniforms.uTop.value.set(top)
    uniforms.uBottom.value.set(bottom)
  }, [uniforms, top, bottom])

  return (
    <mesh scale={180} renderOrder={-10}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

/** Estrellas tenues detrás del diorama (0 de día, 1 de noche). */
export function Stars({ opacity, count = 420 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      // Solo en la franja de cielo que la cámara alcanza a ver
      const y = -0.1 + Math.random() * 0.9
      const r = Math.sqrt(1 - y * y)
      arr[i * 3] = Math.cos(theta) * r * 150
      arr[i * 3 + 1] = y * 150
      arr[i * 3 + 2] = Math.sin(theta) * r * 150
    }
    return arr
  }, [count])

  return (
    <points renderOrder={-9} visible={opacity > 0.01}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#cfd6ff" size={1.6} sizeAttenuation={false} transparent opacity={opacity * 0.6} depthWrite={false} fog={false} />
    </points>
  )
}
