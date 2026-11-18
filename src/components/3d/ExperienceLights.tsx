import { useRef } from 'react';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  Stars,
  Sparkles
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { CONFIG } from '../../constants/config';
import type { SceneState, ZoomState } from '../../types';

interface ExperienceLightsProps {
  sceneState: SceneState;
  zoomState?: ZoomState;
}

export const ExperienceLights = ({ sceneState, zoomState }: ExperienceLightsProps) => {
  const controlsRef = useRef<any>(null);

  // Tắt autoRotate khi đang zoom
  const shouldAutoRotate = sceneState === 'FORMED' && !zoomState?.active;

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 15, 45]}
        fov={50}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        minDistance={15}
        maxDistance={80}
        rotateSpeed={1.2}
        autoRotate={shouldAutoRotate}
        autoRotateSpeed={0.3}
      />

      <color
        attach='background'
        args={['#000300']}
      />
      
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      
      <Environment
        preset='city'
        background={false}
      />

      <ambientLight
        intensity={0.5}
        color='#003311'
      />
      <ambientLight
        intensity={0.3}
        color='#666688'
      />
      <spotLight
        position={[10, 20, 10]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
        color='#fffaed'
      />
      <pointLight
        position={[30, 30, 30]}
        intensity={100}
        color={CONFIG.colors.warmLight}
      />
      <pointLight
        position={[-30, 10, -30]}
        intensity={50}
        color={CONFIG.colors.gold}
      />
      <pointLight
        position={[0, -20, 10]}
        intensity={30}
        color='#ffffff'
      />

      <Sparkles
        count={600}
        scale={50}
        size={8}
        speed={0.4}
        opacity={0.4}
        color={CONFIG.colors.silver}
      />

      {/* multisampling mặc định đã giảm từ 8 xuống 4 ở bản 3.2; giữ 8 cho viền mịn như trước */}
      <EffectComposer multisampling={8}>
        <Bloom
          luminanceThreshold={0.5}
          luminanceSmoothing={0.1}
          intensity={1.5}
          radius={0.6}
          mipmapBlur
        />
        <Vignette
          offset={0.1}
          darkness={1.1}
        />
      </EffectComposer>
    </>
  );
};

