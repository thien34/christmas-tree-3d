import { memo, Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneState, ThemeColors, TreeStyle, ZoomState } from '../../types';
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

interface ExperienceProps {
  sceneState: SceneState;
  photoUrls: string[];
  zoomState: ZoomState;
  themeColors: ThemeColors;
  treeStyle: TreeStyle;
}

/**
 * Toàn bộ cảnh 3D. Bọc `memo` để các lần re-render của UI (vd. dòng trạng thái)
 * không làm render lại hàng trăm mesh bên trong.
 */
export const Experience = memo(({ sceneState, photoUrls, zoomState, themeColors, treeStyle }: ExperienceProps) => {
  const treeRef = useRef<THREE.Group>(null);

  // Cây quay chậm liên tục, dừng lại khi đang phóng to ảnh
  useFrame((_, delta) => {
    if (treeRef.current && !zoomState.active) treeRef.current.rotation.y += delta * TREE_SPIN_SPEED;
  });

  const decorationProps = { state: sceneState, themeColors, treeStyle };

  return (
    <>
      <CameraRig autoRotate={sceneState === 'FORMED' && !zoomState.active} />
      <SceneLighting />
      <Atmosphere />

      <group ref={treeRef} position={[0, -2, 0]}>
        <Foliage {...decorationProps} />
        <ChristmasBalls {...decorationProps} />
        <FairyLights {...decorationProps} />
        <GiftBoxes {...decorationProps} />
        <TopStar state={sceneState} color={themeColors.gold} />

        {photoUrls.length > 0 && (
          // Suspense riêng: lúc đang tải ảnh mới, phần còn lại của cây không bị ẩn đi
          <Suspense fallback={null}>
            <PhotoOrnaments state={sceneState} photoUrls={photoUrls} zoomState={zoomState} />
          </Suspense>
        )}
      </group>

      <PostEffects />
    </>
  );
});
