import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useStore } from '../../store';
import { ChristmasBalls } from './ChristmasBalls';
import { FairyLights } from './FairyLights';
import { Foliage } from './Foliage';
import { GiftBoxes } from './GiftBoxes';
import { PhotoOrnaments } from './photos/PhotoOrnaments';
import { Atmosphere } from './scene/Atmosphere';
import { CameraRig } from './scene/CameraRig';
import { PostEffects } from './scene/PostEffects';
import { SceneLighting } from './scene/SceneLighting';
import { TopStar } from './TopStar';

/** Tốc độ cây tự quay (rad/giây). */
const TREE_SPIN_SPEED = 0.2;

/** Toàn bộ cảnh 3D. Mỗi phần tự đọc trạng thái mình cần từ store. */
export const Experience = () => {
  const treeRef = useRef<THREE.Group>(null);

  // Cây quay chậm liên tục, dừng lại khi đang phóng to ảnh
  useFrame((_, delta) => {
    if (treeRef.current && !useStore.getState().pinch) treeRef.current.rotation.y += delta * TREE_SPIN_SPEED;
  });

  return (
    <>
      <CameraRig />
      <SceneLighting />
      <Atmosphere />

      <group ref={treeRef} position={[0, -2, 0]}>
        <Foliage />
        <ChristmasBalls />
        <FairyLights />
        <GiftBoxes />
        <TopStar />
        <PhotoOrnaments />
      </group>

      <PostEffects />
    </>
  );
};
