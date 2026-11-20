import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GLITTER_COUNT = 3200;
/** Bụi tuyết rải trong đĩa bán kính này quanh gốc, dày nhất gần gốc cây. */
const GLITTER_RADIUS = 35;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uViewportHeight;
  attribute float aRandom;
  varying float vTwinkle;

  void main() {
    // Mỗi hạt lấp lánh theo nhịp riêng, phần lớn thời gian chỉ le lói
    float wave = 0.5 + 0.5 * sin(uTime * (1.0 + 2.5 * aRandom) + aRandom * 60.0);
    vTwinkle = wave * wave * wave;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = max(-mvPosition.z, 0.001);
    float size = (0.12 + 0.12 * aRandom) * projectionMatrix[1][1] * uViewportHeight * 0.5 / depth;
    gl_PointSize = clamp(size, 1.0, uViewportHeight * 0.01);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/*
 * Alpha luôn nằm trong [0, 1]. Không dùng <Sparkles> của drei: shader của nó cho alpha = 0.05 / d - 0.1, ở tâm hạt
 * (d ≈ 0) alpha tiến tới vô cùng. Màn hình thường tự kẹp về 1 nên không thấy, nhưng EffectComposer vẽ vào
 * render target HalfFloat không kẹp giá trị, sinh ra pixel Inf/NaN/âm; Bloom (mipmap blur) loang chúng ra
 * thành mảng lớn nhấp nháy trên màn hình.
 */
const fragmentShader = /* glsl */ `
  varying float vTwinkle;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(vec3(0.66, 0.84, 1.0), clamp(glow * glow * vTwinkle, 0.0, 1.0));
  }
`;

/** Bụi tuyết lấp lánh trên mặt đất quanh gốc cây; nhấp nháy tính hoàn toàn trên GPU. */
export const GroundGlitter = ({ y }: { y: number }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(GLITTER_COUNT * 3);
    for (let i = 0; i < GLITTER_COUNT; i++) {
      const radius = GLITTER_RADIUS * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = y + Math.random() * 0.4;
      positions[i * 3 + 2] = radius * Math.sin(theta);
    }
    const glitter = new THREE.BufferGeometry();
    glitter.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    glitter.setAttribute('aRandom', new THREE.BufferAttribute(Float32Array.from({ length: GLITTER_COUNT }, Math.random), 1));
    return glitter;
  }, [y]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uViewportHeight: { value: 1000 } }), []);

  useFrame(({ clock, size, viewport }) => {
    const live = materialRef.current?.uniforms;
    if (!live) return;
    live.uTime.value = clock.elapsedTime;
    live.uViewportHeight.value = size.height * viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  );
};
