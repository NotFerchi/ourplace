import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, Pixelation, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { CONFIG } from '../config'
import CameraRig, { INITIAL_CAMERA } from './CameraRig'
import { useDayCycle } from './dayCycle'
import MyPlaceModel, { ModelBoundary } from './MyPlaceModel'
import Particles from './Particles'
import PlaceholderScene from './PlaceholderScene'
import { SkyDome, Stars } from './Sky'

/** Canvas 3D de pantalla completa que vive detrás del HUD. */
export default function Scene({ zen }) {
  const cycle = useDayCycle()
  const placeholder = <PlaceholderScene night={cycle.night} />

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: INITIAL_CAMERA, fov: 30, near: 1, far: 420 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      {/* Cielo y niebla del mismo color: el bosque y el lago se funden con el fondo */}
      <SkyDome top={cycle.skyTop} bottom={cycle.skyBottom} />
      <Stars opacity={cycle.night} />
      <fogExp2 attach="fog" color={cycle.fog} density={0.014} />

      <hemisphereLight color={cycle.ambient} groundColor="#141826" intensity={cycle.hemiIntensity} />
      <directionalLight
        castShadow
        position={cycle.lightPosition}
        color={cycle.sunColor}
        intensity={cycle.sunIntensity}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-far={70}
        shadow-bias={-0.0008}
        shadow-normalBias={0.04}
      />

      {/* Relleno muy tenue de frente, para que el acantilado no se vuelva una mancha negra */}
      <directionalLight position={[-10, 3, 16]} color={cycle.ambient} intensity={0.75} />

      <Suspense fallback={null}>
        {CONFIG.model.enabled ? (
          <ModelBoundary fallback={placeholder}>
            <MyPlaceModel />
          </ModelBoundary>
        ) : (
          placeholder
        )}
      </Suspense>

      {/* Luciérnagas de noche sobre el claro */}
      <Particles
        count={90}
        position={[0, 1.5, -0.5]}
        scale={[22, 2.6, 12]}
        size={4}
        speed={0.5}
        color="#ffe08a"
        opacity={cycle.night * 0.95}
        glow={2.4}
      />

      <CameraRig zen={zen} />

      {/* Post-procesado retro: resplandor cálido + píxel sutil */}
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur luminanceThreshold={1} intensity={0.7} />
        <Pixelation granularity={2} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  )
}
