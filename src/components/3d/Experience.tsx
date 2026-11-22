import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Selection } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStore } from '../../store';
import { ChristmasBalls } from './ChristmasBalls';
import { DecorOrnaments } from './DecorOrnaments';
import { FairyLights } from './FairyLights';
import { Foliage } from './Foliage';
import { Garland } from './Garland';
import { GiftBoxes } from './GiftBoxes';
import { PhotoOrnaments } from './photos/PhotoOrnaments';
import { Atmosphere } from './scene/Atmosphere';
import { CameraRig } from './scene/CameraRig';
import { Fireworks } from './scene/Fireworks';
import { FormationBurst } from './scene/FormationBurst';
import { PostEffects } from './scene/PostEffects';
import { SceneLighting } from './scene/SceneLighting';
import { TopStar } from './TopStar';
import { TreeBase } from './TreeBase';
import { useFormationTracker } from './shared/formation';

/** Tốc độ cây tự quay (rad/giây). */
const TREE_SPIN_SPEED = 0.2;
/** Mỗi lần nhấn phím mũi tên cộng thêm chừng này vào tốc độ quay (rad/giây)... */
const SPIN_KICK = 6;
/** ...rồi tốc độ dịu dần về TREE_SPIN_SPEED; cây quay thêm khoảng KICK / SETTLE rad (~2/3 vòng) mỗi lần nhấn. */
const SPIN_SETTLE_SPEED = 1.5;

/** Toàn bộ cảnh 3D. Mỗi phần tự đọc trạng thái mình cần từ store. */
export const Experience = () => {
  const treeRef = useRef<THREE.Group>(null);
  /** Tốc độ quay hiện tại, và yêu cầu xoay gần nhất đã xử lý (so tham chiếu để nhận ra yêu cầu mới). */
  const spin = useRef<{ speed: number; handled: object | null }>({ speed: TREE_SPIN_SPEED, handled: null });
  useFormationTracker();

  // Cây quay chậm liên tục, nhấn ← → thì quay vút theo hướng đó; dừng lại khi đang phóng to ảnh
  useFrame((_, delta) => {
    const { pinch, spinRequest } = useStore.getState();
    const state = spin.current;
    if (spinRequest && spinRequest !== state.handled) state.speed += spinRequest.direction * SPIN_KICK;
    state.handled = spinRequest;
    state.speed = THREE.MathUtils.damp(state.speed, TREE_SPIN_SPEED, SPIN_SETTLE_SPEED, delta);
    // Quay dương (ngược chiều kim đồng hồ nhìn từ trên xuống) đưa mặt trước của cây sang phải màn hình
    if (treeRef.current && !pinch) treeRef.current.rotation.y += delta * state.speed;
  });

  return (
    // Selection: gom các vật bọc trong <Select> (ảnh Polaroid) để PostEffects loại chúng khỏi bloom
    <Selection>
      <CameraRig />
      <SceneLighting />
      <Atmosphere />

      <group ref={treeRef} position={[0, 0.5, 0]}>
        <Foliage />
        <ChristmasBalls />
        <DecorOrnaments />
        <Garland />
        <FairyLights />
        <GiftBoxes />
        <TopStar />
        <TreeBase />
        <PhotoOrnaments />
      </group>

      <FormationBurst />
      <Fireworks />
      <PostEffects />
    </Selection>
  );
};
