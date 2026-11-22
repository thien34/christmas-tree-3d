import * as THREE from 'three';
import { Billboard } from '@react-three/drei';

/*
 * Vầng trăng xa trên trời: một tấm phẳng luôn quay về camera, vẽ đĩa trăng có vài vết mờ và quầng sáng nhẹ.
 * Đặt xa hơn vòng núi (DistantHills) nên di chuyển camera vẫn thấy trăng đứng yên như ở rất xa.
 */

const POSITION: [number, number, number] = [-95, 38, -250];
const SIZE = 70;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
  }

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p);
    const float DISC = 0.085;
    float disc = 1.0 - smoothstep(DISC - 0.004, DISC, r);
    // Vết "biển" tối trên mặt trăng
    float maria = noise(p * 38.0 + 3.0) * 0.6 + noise(p * 90.0) * 0.4;
    vec3 surface = vec3(0.96, 0.94, 0.86) * (0.78 + 0.22 * smoothstep(0.35, 0.75, maria));
    // Mép đĩa tối hơn chút cho tròn khối
    surface *= 1.0 - 0.25 * smoothstep(0.0, DISC, r);
    float halo = exp(-max(r - DISC, 0.0) * 22.0) * 0.35 + exp(-max(r - DISC, 0.0) * 6.0) * 0.08;
    vec3 color = surface * disc + vec3(0.75, 0.8, 1.0) * halo * (1.0 - disc);
    float alpha = clamp(disc + halo * (1.0 - smoothstep(0.4, 0.5, r)), 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const Moon = () => (
  <Billboard position={POSITION}>
    <mesh renderOrder={-8}>
      <planeGeometry args={[SIZE, SIZE]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  </Billboard>
);
