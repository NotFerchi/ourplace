import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color } from 'three'

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSpeed;
  uniform float uRise;
  uniform vec3 uBox;
  attribute vec4 aSeed;
  varying float vTwinkle;

  void main() {
    float t = uTime * uSpeed;
    vec3 p = position;
    // Deriva suave alrededor de su punto de origen
    p.x += sin(t * 0.7 + aSeed.x * 6.283) * 0.6;
    p.z += cos(t * 0.6 + aSeed.z * 6.283) * 0.6;
    p.y += sin(t * 0.9 + aSeed.y * 6.283) * 0.3;
    // Si uRise > 0 la partícula sube en bucle (chispas, bruma)
    p.y += (fract(aSeed.y + uTime * uRise) - 0.5) * uBox.y * step(0.0001, uRise);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * uPixelRatio * (0.5 + aSeed.w) * (28.0 / -mv.z), 1.0, 28.0);
    vTwinkle = 0.55 + 0.45 * sin(t * 2.0 + aSeed.x * 40.0);
  }
`

// Disco suave con valores siempre finitos: un brillo tipo 1/distancia daría
// infinito en el centro y el Bloom lo extendería a toda la pantalla.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uGlow;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, d) * uOpacity * vTwinkle;
    gl_FragColor = vec4(uColor * uGlow, clamp(alpha, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * Partículas ligeras (luciérnagas, polvo, chispas, bruma).
 * `scale` es la caja donde se reparten; `glow` > 1 las hace brillar con el Bloom.
 */
export default function Particles({
  count = 50,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  size = 3,
  speed = 0.3,
  rise = 0,
  color = '#ffffff',
  opacity = 1,
  glow = 1,
}) {
  const pixelRatio = useThree((s) => s.viewport.dpr)

  const { positions, seeds } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const s = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * scale[0]
      p[i * 3 + 1] = (Math.random() - 0.5) * scale[1]
      p[i * 3 + 2] = (Math.random() - 0.5) * scale[2]
      for (let k = 0; k < 4; k++) s[i * 4 + k] = Math.random()
    }
    return { positions: p, seeds: s }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, scale[0], scale[1], scale[2]])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uSpeed: { value: speed },
      uRise: { value: rise },
      uBox: { value: scale },
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uGlow: { value: glow },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    uniforms.uSize.value = size
    uniforms.uSpeed.value = speed
    uniforms.uRise.value = rise
    uniforms.uColor.value.set(color)
    uniforms.uOpacity.value = opacity
    uniforms.uGlow.value = glow
    uniforms.uPixelRatio.value = pixelRatio
  }, [uniforms, size, speed, rise, color, opacity, glow, pixelRatio])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points position={position} frustumCulled={false} visible={opacity > 0.01}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 4]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
