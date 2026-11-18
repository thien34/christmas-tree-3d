import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import type { SceneState } from '../../types';

const SPIN_SPEED = 0.5;
const GROW_SPEED = 3;

/** Hình ngôi sao `points` cánh, bán kính đỉnh ngoài `outer` và đỉnh trong `inner`. */
const createStarShape = (points = 5, outer = 1.3, inner = 0.7) => {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const [x, y] = [radius * Math.cos(angle), radius * Math.sin(angle)];
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
};

const createStarGeometry = () =>
  new THREE.ExtrudeGeometry(createStarShape(), {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 3,
  }).center();

interface TopStarProps {
  state: SceneState;
  color: string;
}

/** Ngôi sao trên đỉnh cây: chỉ hiện (phóng to dần) khi cây đã thành hình. */
export const TopStar = ({ state, color }: TopStarProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => createStarGeometry(), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += delta * SPIN_SPEED;
    group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, state === 'FORMED' ? 1 : 0, GROW_SPEED, delta));
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.tree.height / 2 + 1.8, 0]} scale={0}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh geometry={geometry}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} roughness={0.1} metalness={1} />
        </mesh>
      </Float>
    </group>
  );
};
