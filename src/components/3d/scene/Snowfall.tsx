import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { randomSpread } from '../../../utils/random';

const FLAKE_COUNT = 1400;
/** Tuyết rơi trong một khối hộp quanh cây; bông nào rơi tới đáy thì quay lại từ trên đỉnh. */
const AREA = { width: 110, height: 70 };

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uHeight;
  uniform float uViewportHeight;
  attribute float aRandom;

  void main() {
    vec3 pos = position;
    // Rơi đều xuống rồi lặp lại; mỗi bông một tốc độ và lắc lư ngang một chút
    pos.y = mod(pos.y - uTime * (1.5 + aRandom * 2.0), uHeight) - uHeight * 0.4;
    pos.x += sin(uTime * 0.6 + aRandom * 40.0) * 0.8;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float size = (0.14 + 0.18 * aRandom) * projectionMatrix[1][1] * uViewportHeight * 0.5 / -mvPosition.z;
    gl_PointSize = min(size, uViewportHeight * 0.012); // bông ở sát camera không phình to quá
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  void main() {
    // Bông tuyết tròn, mờ dần ra mép
    float fade = smoothstep(0.5, 0.1, distance(gl_PointCoord, vec2(0.5)));
    gl_FragColor = vec4(vec3(0.8, 0.86, 1.0), fade * 0.7);
  }
`;

/** Tuyết rơi nhẹ quanh cảnh; chuyển động tính hoàn toàn trên GPU. */
export const Snowfall = () => {
  const geometry = useMemo(() => {
    const positions = Float32Array.from({ length: FLAKE_COUNT * 3 }, (_, i) =>
      i % 3 === 1 ? Math.random() * AREA.height : randomSpread(AREA.width),
    );
    const flakes = new THREE.BufferGeometry();
    flakes.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    flakes.setAttribute('aRandom', new THREE.BufferAttribute(Float32Array.from({ length: FLAKE_COUNT }, Math.random), 1));
    return flakes;
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uHeight: { value: AREA.height }, uViewportHeight: { value: 1000 } }), []);

  useFrame(({ clock, size, viewport }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uViewportHeight.value = size.height * viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  );
};
