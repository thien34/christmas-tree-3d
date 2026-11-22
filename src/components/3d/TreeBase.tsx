import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BASS_CHANNEL, pulse } from '../../audio/music';
import { CONFIG } from '../../constants/config';
import { fadeColor, THEMES } from '../../constants/themes';
import { useStore } from '../../store';
import { GROUND_Y } from '../../utils/treePositions';
import { GroundGlitter } from './scene/GroundGlitter';
import { burstAge } from './shared/formation';
import { growWhenFormed } from './shared/motion';

/** Nền tuyết trải tới tận vòng núi xa (DistantHills), để giữa cây và núi không bị hở một vùng tối. */
const GROUND_RADIUS = 190;
/** Vòng sáng lúc cây thành hình lan ra với tốc độ này (đơn vị cảnh/giây). */
const RING_SPEED = 32;

const groundVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/*
 * Nền tuyết: gradient toả tròn từ gốc cây (4 màu của theme), mờ dần ra mép để hoà vào bầu trời.
 * - Ngay sát gốc tối đi một chút như bóng của cây.
 * - Có nhạc thì vùng sáng quanh gốc ửng lên theo phách mạnh.
 * - Lúc cây vừa thành hình, một vòng sáng lan ra từ gốc (uRingAge = số giây từ lúc loé sáng).
 */
const groundFragmentShader = /* glsl */ `
  uniform vec3 uCenter;
  uniform vec3 uNear;
  uniform vec3 uFar;
  uniform vec3 uEdge;
  uniform vec3 uRingColor;
  uniform float uPulse;
  uniform float uRingAge;
  uniform float uRingSpeed;
  uniform float uRadius;
  varying vec2 vUv;

  void main() {
      // Khoảng cách tới gốc cây theo đơn vị cảnh
    float r = length(vUv - 0.5) * 2.0 * uRadius;
    vec3 color = mix(uCenter, uNear, smoothstep(0.0, 13.0, r));
    color = mix(color, uFar, smoothstep(13.0, 36.0, r));
    // Xa hơn thì nhạt dần sang màu mép, nhưng vẫn còn ánh xanh của tuyết tới tận chân núi
    color = mix(color, mix(uFar, uEdge, 0.6), smoothstep(36.0, 150.0, r));
    // Hắt sáng theo nhạc quanh gốc
    color *= 1.0 + 0.35 * uPulse * (1.0 - smoothstep(0.0, 24.0, r));
    // Bóng của cây sát gốc
    color *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 5.5, r));

    if (uRingAge >= 0.0) {
      float ringR = uRingAge * uRingSpeed;
      float x = (r - ringR) / 2.0; // không dùng pow(): pow với cơ số âm cho kết quả không xác định trên GPU
      float ring = exp(-x * x) * exp(-uRingAge * 1.1);
      color += uRingColor * ring * 1.5;
    }

    float alpha = 1.0 - smoothstep(0.9, 1.0, r / uRadius);
    gl_FragColor = vec4(min(color, vec3(3.0)), alpha);
    #include <colorspace_fragment>
  }
`;

const createGroundUniforms = () => {
  const [center, near, far, edge] = THEMES.christmas.ground;
  return {
    uCenter: { value: new THREE.Color(center) },
    uNear: { value: new THREE.Color(near) },
    uFar: { value: new THREE.Color(far) },
    uEdge: { value: new THREE.Color(edge) },
    uRingColor: { value: new THREE.Color(THEMES.christmas.gold) },
    uPulse: { value: 0 },
    uRingAge: { value: -1 },
    uRingSpeed: { value: RING_SPEED },
    uRadius: { value: GROUND_RADIUS },
  };
};

/** Thân cây (chỉ hiện khi cây đã thành hình), nền tuyết quanh gốc và lớp bụi tuyết lấp lánh trên mặt đất. */
export const TreeBase = () => {
  const trunkRef = useRef<THREE.Mesh>(null);
  const groundRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(createGroundUniforms, []);
  // Thân chạy từ mặt đất lên gần ngọn, thon dần, để nhìn qua khe giữa các cành vẫn thấy thân
  const trunkLength = CONFIG.tree.trunkHeight + CONFIG.tree.height * 0.9;

  useFrame((_, delta) => {
    if (trunkRef.current) growWhenFormed(trunkRef.current, 3, delta);
    const live = groundRef.current?.uniforms;
    if (!live) return;
    const theme = THEMES[useStore.getState().theme];
    fadeColor(live.uCenter.value, theme.ground[0], delta);
    fadeColor(live.uNear.value, theme.ground[1], delta);
    fadeColor(live.uFar.value, theme.ground[2], delta);
    fadeColor(live.uEdge.value, theme.ground[3], delta);
    fadeColor(live.uRingColor.value, theme.gold, delta);
    live.uPulse.value = pulse(BASS_CHANNEL);
    const age = burstAge();
    live.uRingAge.value = age >= 0 && age < 4 ? age : -1;
  });

  return (
    <>
      <mesh ref={trunkRef} position={[0, GROUND_Y + trunkLength / 2, 0]} scale={0}>
        <cylinderGeometry args={[0.1, 1, trunkLength, 12]} />
        <meshStandardMaterial color="#4a2f1c" roughness={0.9} />
      </mesh>

      {/* renderOrder âm: vẽ trước các lớp hạt trong suốt (bụi tuyết lấp lánh, tuyết rơi) để không đè lên chúng */}
      <mesh position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 128]} />
        <shaderMaterial
          ref={groundRef}
          uniforms={uniforms}
          vertexShader={groundVertexShader}
          fragmentShader={groundFragmentShader}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <GroundGlitter y={GROUND_Y + 0.1} />
    </>
  );
};
