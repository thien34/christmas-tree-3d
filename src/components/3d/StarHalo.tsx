import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { BASS_CHANNEL, pulse } from '../../audio/music';
import { burstAge } from './shared/formation';

/*
 * Quầng sáng quanh ngôi sao: một tấm phẳng luôn quay mặt về camera, vẽ quầng tròn mờ + tia sáng hình chữ thập
 * (4 tia dài, 4 tia chéo ngắn) xoay chậm ngược chiều ngôi sao. Cộng màu (additive) nên chỉ làm sáng thêm.
 * Lúc cây vừa thành hình, quầng loé to rồi dịu lại; có nhạc thì nảy theo phách mạnh.
 */

const SIZE = 9;
/** Lúc loé sáng, quầng to gấp (1 + FLASH_GROW) lần rồi thu về trong khoảng 1.5 giây. */
const FLASH_GROW = 1.6;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* Alpha và màu luôn hữu hạn, kẹp trong khoảng an toàn (render target HalfFloat của EffectComposer không tự kẹp). */
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRotation;
  uniform float uIntensity;
  varying vec2 vUv;

  float ray(vec2 p, float width) {
    return exp(-abs(p.y) / width) * max(0.0, 1.0 - abs(p.x) * 2.0);
  }

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p);
    float cs = cos(uRotation);
    float sn = sin(uRotation);
    vec2 q = mat2(cs, -sn, sn, cs) * p;
    // Tia dọc/ngang dài và mảnh, tia chéo ngắn hơn
    float rays = ray(q, 0.006) + ray(q.yx, 0.006);
    vec2 d = mat2(0.7071, -0.7071, 0.7071, 0.7071) * q;
    rays += 0.45 * (ray(d * 1.8, 0.005) + ray(d.yx * 1.8, 0.005));
    float glow = exp(-r * 11.0) * 0.9 + exp(-r * 4.5) * 0.25;
    // Tắt dần từ giữa ra mép tấm phẳng để không lộ viền tròn
    float a = (glow + rays * 0.8) * uIntensity * (1.0 - smoothstep(0.12, 0.5, r));
    gl_FragColor = vec4(min(uColor * a, vec3(2.0)), 1.0);
  }
`;

export const StarHalo = ({ color }: { color: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(color) }, uRotation: { value: 0 }, uIntensity: { value: 1 } }),
    [],
  );

  useFrame(({ clock }) => {
    const live = materialRef.current?.uniforms;
    if (!live || !groupRef.current) return;
    const age = burstAge();
    const flash = age >= 0 ? Math.exp(-age * 2) : 0;
    const beat = pulse(BASS_CHANNEL);
    const time = clock.elapsedTime;
    live.uColor.value.set(color);
    live.uRotation.value = -time * 0.15;
    // Nhấp nháy rất nhẹ cho có hồn, cộng thêm loé sáng và nhịp nhạc
    live.uIntensity.value = 0.75 + 0.1 * Math.sin(time * 2.3) + 0.45 * beat + 1.2 * flash;
    groupRef.current.scale.setScalar(1 + 0.15 * beat + FLASH_GROW * flash);
  });

  return (
    <Billboard ref={groupRef}>
      <mesh renderOrder={2}>
        <planeGeometry args={[SIZE, SIZE]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
};
