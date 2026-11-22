import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fadeColor, THEMES } from '../../../constants/themes';
import { useStore } from '../../../store';

/*
 * Cực quang: một dải cong lớn phía sau cây (đoạn của mặt trụ, xa hơn vòng núi nên chân dải khuất sau núi).
 * Shader vẽ các "rèm" sáng: mép dưới uốn lượn chậm, sáng nhất ở chân rồi nhạt dần lên trên, có các tia dọc mảnh.
 * Cộng màu (additive) và để rất dịu, độ sáng luôn dưới ngưỡng Bloom; màu theo theme.
 */

const RADIUS = 250;
const HEIGHT = 120;
const BOTTOM_Y = -5;
/** Độ rộng dải (rad), tâm ở phía sau cây (hướng -Z, nơi camera nhìn tới lúc đầu). */
const ARC = 2.8;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  varying vec2 vUv;

  float curtain(float u, float v, float seed, float speed) {
    float t = uTime * speed;
    // Mép dưới của rèm uốn lượn theo thời gian
    float base = 0.2 + 0.06 * sin(u * 7.0 + t + seed) + 0.04 * sin(u * 17.0 - t * 1.7 + seed * 2.0);
    float above = v - base;
    float body = smoothstep(-0.015, 0.02, above) * exp(-max(above, 0.0) * (3.2 + seed * 0.5));
    // Tia dọc mảnh, trôi chậm sang ngang
    float rays = 0.55 + 0.45 * sin(u * 160.0 + sin(u * 11.0 + t * 0.7) * 4.0 + seed * 5.0);
    // Chỗ đậm chỗ nhạt dọc theo dải
    float strength = smoothstep(0.15, 0.9, 0.5 + 0.5 * sin(u * 5.0 - t * 0.5 + seed * 3.0));
    return body * rays * strength;
  }

  void main() {
    float u = vUv.x;
    float v = vUv.y;
    float a = curtain(u, v, 0.0, 0.12) + 0.6 * curtain(u + 0.13, v + 0.05, 2.3, 0.09);
    // Mờ dần ở hai đầu dải và gần đỉnh
    a *= sin(u * 3.14159265) * (1.0 - smoothstep(0.7, 1.0, v));
    vec3 color = mix(uLow, uHigh, smoothstep(0.18, 0.55, v));
    gl_FragColor = vec4(color * clamp(a, 0.0, 1.0) * 0.38, 1.0);
  }
`;

export const Aurora = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => {
    const [low, high] = THEMES.christmas.aurora;
    return { uTime: { value: 0 }, uLow: { value: new THREE.Color(low) }, uHigh: { value: new THREE.Color(high) } };
  }, []);

  useFrame(({ clock }, delta) => {
    const live = materialRef.current?.uniforms;
    if (!live) return;
    const [low, high] = THEMES[useStore.getState().theme].aurora;
    live.uTime.value = clock.elapsedTime;
    fadeColor(live.uLow.value, low, delta);
    fadeColor(live.uHigh.value, high, delta);
  });

  return (
    <mesh position={[0, BOTTOM_Y + HEIGHT / 2, 0]} renderOrder={-7} frustumCulled={false}>
      {/* Đoạn mặt trụ hở: three đặt theta = π ở hướng -Z */}
      <cylinderGeometry args={[RADIUS, RADIUS, HEIGHT, 96, 1, true, Math.PI - ARC / 2, ARC]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
};
