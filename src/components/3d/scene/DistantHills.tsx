import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fadeColor, THEMES } from '../../../constants/themes';
import { useStore } from '../../../store';

/*
 * Phông nền xa: một vòng trụ lớn bao quanh cảnh, vẽ hai lớp bóng núi in lên trời đêm.
 * - Lớp xa: dãy núi nhạt, mờ sương, gần màu chân trời.
 * - Lớp gần: đồi phủ tuyết, sẫm hơn lớp xa, với hàng thông tối nhọn trên đỉnh.
 * Đường núi chỉ dùng tổng các hàm sin của góc nên khép kín trọn vòng, không có đường nối.
 * Vật liệu đặc, có ghi depth: sao (Atmosphere) nằm xa hơn vòng núi nên bị núi che đúng như thật.
 */

const RADIUS = 190;
const BOTTOM_Y = -30;
const HEIGHT = 80;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec2 vUv;

  const float TAU = 6.2831853;

  float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

  // Độ cao đỉnh núi lớp xa / lớp gần theo vị trí quanh vòng (0–1), tính theo vUv.y
  float farRidge(float u) {
    float a = u * TAU;
    return 0.58 + 0.07 * sin(a * 3.0 + 1.3) + 0.045 * sin(a * 7.0 + 0.4) + 0.025 * sin(a * 17.0 + 2.1)
      + 0.012 * sin(a * 41.0);
  }
  float nearRidge(float u) {
    float a = u * TAU;
    return 0.4 + 0.035 * sin(a * 4.0 + 2.7) + 0.02 * sin(a * 11.0 + 0.9) + 0.01 * sin(a * 23.0 + 1.7);
  }

  // Hàng thông trên lớp gần: mỗi ô là một cây (có ô trống), thân nhọn hình tam giác, xếp ba tầng tán
  float pines(float u, float v, float base) {
    const float N = 420.0;
    float cell = floor(u * N);
    float f = fract(u * N) - 0.5;
    float h = (0.03 + 0.045 * hash(cell)) * step(0.15, hash(cell + 7.0));
    float y = (v - base) / max(h, 1e-4);
    if (h <= 0.0 || y < 0.0 || y > 1.0) return 0.0;
    float tier = fract(y * 3.0);
    float width = 0.48 * (1.0 - y) * (0.75 + 0.25 * (1.0 - tier));
    return step(abs(f), width);
  }

  void main() {
    float u = vUv.x;
    float v = vUv.y;
    float far = farRidge(u);
    float near = nearRidge(u);
    bool onHill = v < near;
    bool onPine = !onHill && pines(u, v, near - 0.004) > 0.5;
    if (!onHill && !onPine && v > far) discard;

    // Lớp xa nhạt dần lên đỉnh như có sương; đồi gần phủ tuyết, hơi sáng dần lên đỉnh; thông gần như đen
    vec3 farColor = mix(uBottom, uHorizon, 0.55 + 0.25 * smoothstep(far - 0.12, far, v));
    vec3 hillColor = mix(uBottom, uHorizon, 0.3 + 0.2 * smoothstep(near - 0.15, near, v));
    vec3 color = onPine ? uBottom * 0.55 : onHill ? hillColor : farColor;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const DistantHills = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => {
    const [, horizon, bottom] = THEMES.christmas.sky;
    return { uHorizon: { value: new THREE.Color(horizon) }, uBottom: { value: new THREE.Color(bottom) } };
  }, []);

  useFrame((_, delta) => {
    const live = materialRef.current?.uniforms;
    if (!live) return;
    const [, horizon, bottom] = THEMES[useStore.getState().theme].sky;
    fadeColor(live.uHorizon.value, horizon, delta);
    fadeColor(live.uBottom.value, bottom, delta);
  });

  return (
    <mesh position={[0, BOTTOM_Y + HEIGHT / 2, 0]} renderOrder={-9} frustumCulled={false}>
      <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, 256, 1, true]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
};
