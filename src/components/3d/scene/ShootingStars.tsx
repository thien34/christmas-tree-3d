import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { randomRange } from '../../../utils/random';

/*
 * Thỉnh thoảng một ngôi sao băng vụt qua bầu trời phía trên dãy núi.
 * Vệt sao là một dải hẹp (4 đỉnh) dựng lại mỗi khung hình: đầu sáng, đuôi mờ dần, luôn quay mặt về camera.
 */

const DISTANCE = 230;
const GAP = { min: 5, max: 13 };
const DURATION = 0.9;
const TRAIL_LENGTH = 32;
const WIDTH = 0.7;

const vertexShader = /* glsl */ `
  attribute float aAlong;
  varying float vAlong;
  void main() {
    vAlong = aAlong;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uFade;
  varying float vAlong;
  void main() {
    // vAlong: 0 ở đuôi, 1 ở đầu
    float a = clamp(vAlong * vAlong * uFade, 0.0, 1.0);
    gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a * 1.6, 1.0);
  }
`;

const head = new THREE.Vector3();
const tail = new THREE.Vector3();
const side = new THREE.Vector3();
const toCamera = new THREE.Vector3();

export const ShootingStars = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const state = useRef({ start: new THREE.Vector3(), direction: new THREE.Vector3(), startTime: 0, next: 3 });
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    g.setAttribute('aAlong', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 1]), 1));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    return g;
  }, []);
  const uniforms = useMemo(() => ({ uFade: { value: 0 } }), []);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const live = materialRef.current?.uniforms;
    if (!mesh || !live) return;
    const s = state.current;
    const time = clock.elapsedTime;

    if (time >= s.next) {
      // Điểm xuất phát: một hướng ngẫu nhiên cao hơn chân trời một chút, phía trước mặt camera
      const azimuth = Math.atan2(-camera.position.x, -camera.position.z) + randomRange(-0.9, 0.9);
      const elevation = randomRange(0.05, 0.16);
      s.start.set(Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation));
      s.start.multiplyScalar(DISTANCE);
      // Bay chéo xuống, sang trái hoặc phải
      const tangent = new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
      s.direction.copy(tangent).addScaledVector(new THREE.Vector3(0, -1, 0), randomRange(0.25, 0.5)).normalize();
      s.startTime = time;
      s.next = time + DURATION + randomRange(GAP.min, GAP.max);
    }

    const age = (time - s.startTime) / DURATION;
    mesh.visible = age >= 0 && age <= 1;
    if (!mesh.visible) return;
    live.uFade.value = Math.sin(age * Math.PI);

    head.copy(s.start).addScaledVector(s.direction, age * 70);
    tail.copy(head).addScaledVector(s.direction, -TRAIL_LENGTH * Math.min(1, age * 3));
    toCamera.subVectors(camera.position, head).normalize();
    side.crossVectors(s.direction, toCamera).normalize().multiplyScalar(WIDTH / 2);

    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    // Đuôi thu nhọn lại (bề rộng 0), đầu có bề rộng WIDTH
    position.setXYZ(0, tail.x, tail.y, tail.z);
    position.setXYZ(1, tail.x, tail.y, tail.z);
    position.setXYZ(2, head.x + side.x, head.y + side.y, head.z + side.z);
    position.setXYZ(3, head.x - side.x, head.y - side.y, head.z - side.z);
    position.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false} visible={false} renderOrder={-6}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
};
