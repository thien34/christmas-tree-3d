import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { BASS_CHANNEL, pulse } from '../../audio/music';
import { CONFIG } from '../../constants/config';
import { useThemeColors } from '../../store';
import { growWhenFormed } from './shared/motion';

const SPIN_SPEED = 0.5;
const GROW_SPEED = 3;
/**
 * Tâm ngôi sao cao hơn đỉnh tán (y = height/2) chừng này: ngọn cành cao nhất ở khoảng height/2 - 0.6,
 * hai cánh dưới của sao thấp hơn tâm ~1.3, nên sao vừa chạm ngọn cây chứ không lơ lửng.
 */
const STAR_LIFT = 0.6;
/** Độ phát sáng của ngôi sao; tăng lên thì quầng sáng toả rộng hơn. */
const STAR_GLOW = 2.2;
/** Có nhạc thì mỗi phách mạnh (bè trầm) làm sao sáng thêm chừng này lần rồi dịu lại. */
const BEAT_BOOST = 0.6;

/** Hình ngôi sao `points` cánh, bán kính đỉnh ngoài `outer` và đỉnh trong `inner`. */
const createStarShape = (points = 5, outer = 1.3, inner = 0.7) => {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    // Bắt đầu từ +90° để cánh đầu tiên chĩa thẳng lên, hai cánh dưới đứng trên ngọn cây
    const angle = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
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

/** Ngôi sao trên đỉnh cây: chỉ hiện (phóng to dần) khi cây đã thành hình. */
export const TopStar = () => {
  const color = useThemeColors().gold;
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const geometry = useMemo(() => createStarGeometry(), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    group.rotation.y += delta * SPIN_SPEED;
    growWhenFormed(group, GROW_SPEED, delta);
    const material = materialRef.current;
    if (material) material.emissiveIntensity = STAR_GLOW * (1 + BEAT_BOOST * pulse(BASS_CHANNEL));
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.tree.height / 2 + STAR_LIFT, 0]} scale={0}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh geometry={geometry}>
          {/* Phát sáng > 1 để vượt ngưỡng Bloom (0.9) và toả quầng như đang cháy sáng */}
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            emissive={color}
            emissiveIntensity={STAR_GLOW}
            roughness={0.25}
            metalness={1}
          />
        </mesh>
      </Float>
    </group>
  );
};
