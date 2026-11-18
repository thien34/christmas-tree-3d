import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GradientTexture, GradientType } from '@react-three/drei';
import type * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { GROUND_Y } from '../../utils/treePositions';
import { growWhenFormed } from './shared/motion';

const GROUND_RADIUS = 80;
/** Gradient toả tròn từ tâm ra đúng mép đĩa nền, vẽ trên ảnh 256×256. */
const RADIAL = { type: GradientType.Radial, size: 256, width: 256, outerCircleRadius: 128 };

/** Thân cây (chỉ hiện khi cây đã thành hình) và nền tuyết quanh gốc. */
export const TreeBase = () => {
  const trunkRef = useRef<THREE.Mesh>(null);
  const { trunkHeight } = CONFIG.tree;

  useFrame((_, delta) => {
    if (trunkRef.current) growWhenFormed(trunkRef.current, 3, delta);
  });

  return (
    <>
      <mesh ref={trunkRef} position={[0, GROUND_Y + trunkHeight / 2, 0]} scale={0}>
        <cylinderGeometry args={[0.8, 1.1, trunkHeight, 12]} />
        <meshStandardMaterial color="#4a2f1c" roughness={0.9} />
      </mesh>

      {/* Nền tuyết: hắt sáng ấm ngay dưới gốc cây, xa dần thì chìm vào màu đêm */}
      <mesh position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
        <meshBasicMaterial transparent depthWrite={false} toneMapped={false}>
          <GradientTexture {...RADIAL} stops={[0, 0.16, 0.45, 1]} colors={['#9a917a', '#56689a', '#22305a', '#101830']} />
          {/* Mờ dần ra mép để nền tuyết hoà vào bầu trời, không lộ đường viền */}
          <GradientTexture {...RADIAL} attach="alphaMap" stops={[0, 0.55, 1]} colors={['#ffffff', '#ffffff', '#000000']} />
        </meshBasicMaterial>
      </mesh>
    </>
  );
};
