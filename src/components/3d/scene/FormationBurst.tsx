import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../../constants/config';
import { THEMES } from '../../../constants/themes';
import { useStore } from '../../../store';
import { burstAge } from '../shared/formation';

/*
 * Lúc cây vừa thành hình: một chùm tia lấp lánh bung ra từ ngôi sao rồi rơi lả tả xuống quanh cây.
 * Quỹ đạo tính hoàn toàn trên GPU từ số giây kể từ lúc loé sáng (uAge): bay ra, chậm dần vì lực cản, rơi vì trọng lực.
 */

const COUNT = 520;
const LIFETIME = 3.2;
/** Vị trí ngôi sao trong toạ độ thế giới (cây đặt ở y = 0.5, ngôi sao cao hơn đỉnh tán 0.6). */
const ORIGIN = new THREE.Vector3(0, 0.5 + CONFIG.tree.height / 2 + 0.6, 0);

const vertexShader = /* glsl */ `
  uniform float uAge;
  uniform float uViewportHeight;
  attribute vec3 aDirection;
  attribute float aSpeed;
  attribute float aRandom;
  varying float vAlpha;
  varying float vMix;

  void main() {
    const float DRAG = 1.8;
    float travel = aSpeed * (1.0 - exp(-DRAG * uAge)) / DRAG;
    vec3 pos = position + aDirection * travel;
    pos.y -= 2.2 * uAge * uAge;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float life = clamp(uAge / (${LIFETIME.toFixed(1)} * (0.6 + 0.4 * aRandom)), 0.0, 1.0);
    // Lấp lánh: mỗi tia nhấp nháy nhanh theo nhịp riêng
    float twinkle = 0.55 + 0.45 * sin(uAge * (18.0 + 14.0 * aRandom) + aRandom * 50.0);
    vAlpha = (1.0 - life) * (1.0 - life) * twinkle;
    vMix = aRandom;
    float size = (0.16 + 0.14 * aRandom) * projectionMatrix[1][1] * uViewportHeight * 0.5 / max(-mvPosition.z, 0.001);
    gl_PointSize = clamp(size, 1.0, uViewportHeight * 0.02);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float a = clamp(glow * glow * vAlpha, 0.0, 1.0);
    // Sáng hơn 1 để Bloom bắt, nhưng có giới hạn
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix) * 2.2, a); // cộng màu: rgb × alpha
  }
`;

export const FormationBurst = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const direction = new THREE.Vector3();
    const directions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Phần lớn bung ngang và hơi hướng lên, như pháo bông nở trên ngọn cây
      direction.randomDirection();
      direction.y = Math.abs(direction.y) * 0.8 - 0.15;
      direction.normalize().toArray(directions, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3).map((_, i) => ORIGIN.getComponent(i % 3)), 3));
    g.setAttribute('aDirection', new THREE.BufferAttribute(directions, 3));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(Float32Array.from({ length: COUNT }, () => 6 + Math.random() * 20), 1));
    g.setAttribute('aRandom', new THREE.BufferAttribute(Float32Array.from({ length: COUNT }, Math.random), 1));
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uAge: { value: 0 },
      uViewportHeight: { value: 1000 },
      uColorA: { value: new THREE.Color() },
      uColorB: { value: new THREE.Color() },
    }),
    [],
  );

  useFrame(({ size, viewport }) => {
    const points = pointsRef.current;
    const live = materialRef.current?.uniforms;
    if (!points || !live) return;
    const age = burstAge();
    points.visible = age >= 0 && age < LIFETIME;
    if (!points.visible) return;
    const theme = THEMES[useStore.getState().theme];
    live.uAge.value = age;
    live.uViewportHeight.value = size.height * viewport.dpr;
    live.uColorA.value.set(theme.gold);
    live.uColorB.value.set(theme.lights[0]);
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} visible={false}>
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
    </points>
  );
};
