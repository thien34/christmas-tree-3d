import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*
 * Vài bông tuyết rơi sát ống kính: to, nhoè như ngoài vùng lấy nét, nên cảnh có thêm một lớp chiều sâu.
 * Toạ độ tính thẳng trong không gian camera (bỏ qua vị trí của vật thể), nên dù camera xoay đi đâu
 * tuyết vẫn luôn rơi ngay trước mặt.
 */

const COUNT = 70;
/** Khối hộp phía trước camera chứa tuyết (đơn vị cảnh, toạ độ camera: -Z là hướng nhìn). */
const BOX = { width: 26, height: 16, near: 4, far: 13 };

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uViewportHeight;
  uniform vec3 uBox; // width, height, depth range
  uniform float uNear;
  attribute float aRandom;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Rơi xuống (theo phương dọc màn hình) rồi quay lại từ trên; lắc ngang nhẹ
    p.y = mod(p.y - uTime * (0.4 + 0.6 * aRandom), uBox.y) - uBox.y * 0.5;
    p.x += sin(uTime * 0.4 + aRandom * 30.0) * 0.6;
    p.z = -(uNear + position.z);

    gl_Position = projectionMatrix * vec4(p, 1.0);
    float size = (0.18 + 0.2 * aRandom) * projectionMatrix[1][1] * uViewportHeight * 0.5 / -p.z;
    gl_PointSize = min(size, uViewportHeight * 0.06);
    // Bông càng gần càng mờ (nhoè), xa hơn thì rõ hơn chút
    vAlpha = 0.12 + 0.18 * smoothstep(uNear, uNear + uBox.z, -p.z);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5)) * 2.0;
    // Đốm tròn mềm, viền sáng hơn ruột một chút như bokeh thật
    float disc = 1.0 - smoothstep(0.75, 1.0, d);
    float rim = smoothstep(0.5, 0.9, d) * disc;
    float a = clamp((disc * 0.6 + rim * 0.4) * vAlpha, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), a);
  }
`;

export const SnowBokeh = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOX.width;
      positions[i * 3 + 1] = Math.random() * BOX.height;
      positions[i * 3 + 2] = Math.random() * (BOX.far - BOX.near);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aRandom', new THREE.BufferAttribute(Float32Array.from({ length: COUNT }, Math.random), 1));
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uViewportHeight: { value: 1000 },
      uBox: { value: new THREE.Vector3(BOX.width, BOX.height, BOX.far - BOX.near) },
      uNear: { value: BOX.near },
    }),
    [],
  );

  useFrame(({ clock, size, viewport }) => {
    const live = materialRef.current?.uniforms;
    if (!live) return;
    live.uTime.value = clock.elapsedTime;
    live.uViewportHeight.value = size.height * viewport.dpr;
  });

  return (
    // renderOrder cao: vẽ sau cùng trong các vật trong suốt vì luôn nằm sát camera nhất
    <points geometry={geometry} frustumCulled={false} renderOrder={5}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </points>
  );
};
