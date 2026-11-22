import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { inSphere } from 'maath/random';
import { CONFIG } from '../../constants/config';
import '../../shaders/FoliageMaterial'; // đăng ký thẻ <foliageMaterial />
import type { FoliageMaterialImpl } from '../../shaders/FoliageMaterial';
import { useStore, useThemeColors } from '../../store';
import { sampleFoliagePoint } from '../../utils/treePositions';
import { createNearestLightFinder, GLOW_REACH, LIGHT_GLOW_TEXTURE } from './shared/lightGlow';
import { damping } from './shared/motion';

const CHAOS_RADIUS = 42;
/** Tốc độ chuyển giữa CHAOS và FORMED (càng lớn càng nhanh). */
const MORPH_SPEED = 1.5;
const COLOR_SPEED = 2;

/**
 * Geometry cho các lá kim: vị trí tán loạn, vị trí trên cây (thành phần thứ 4 là độ sáng của lá)
 * và một số ngẫu nhiên cho kích thước, hướng lá.
 */
const createFoliageGeometry = (count: number) => {
  const onTree = new Float32Array(count * 4);
  /** Bóng đèn gần nhất của từng lá: [chỉ số, khoảng cách]. */
  const nearestLight = new Float32Array(count * 2);
  const findNearestLight = createNearestLightFinder();
  const point = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    // Ghi thẳng vào mảng thay vì `onTree.set([...])`: tránh tạo 70.000 mảng tạm lúc khởi động
    onTree[i * 4 + 3] = sampleFoliagePoint(point);
    point.toArray(onTree, i * 4);
    findNearestLight(point.x, point.y, point.z, nearestLight, i * 2);
  }

  const geometry = new THREE.BufferGeometry();
  const chaos = inSphere(new Float32Array(count * 3), { radius: CHAOS_RADIUS });
  geometry.setAttribute('position', new THREE.BufferAttribute(chaos, 3));
  geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(onTree, 4));
  geometry.setAttribute('aLight', new THREE.BufferAttribute(nearestLight, 2));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(Float32Array.from({ length: count }, Math.random), 1));
  return geometry;
};

/** Tán lá: hàng chục nghìn lá kim vẽ bằng một Points; toàn bộ chuyển động chạy trên GPU (xem FoliageMaterial). */
export const Foliage = () => {
  const { primary } = useThemeColors();
  const materialRef = useRef<FoliageMaterialImpl>(null);
  const geometry = useMemo(() => createFoliageGeometry(CONFIG.counts.foliage), []);
  const targetColor = useMemo(() => new THREE.Color(primary), [primary]);

  useFrame(({ clock, size, viewport }, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const isFormed = useStore.getState().sceneState === 'FORMED';
    material.uTime = clock.elapsedTime;
    material.uViewportHeight = size.height * viewport.dpr;
    material.uProgress = THREE.MathUtils.damp(material.uProgress, isFormed ? 1 : 0, MORPH_SPEED, delta);
    material.uColor.lerp(targetColor, damping(COLOR_SPEED, delta));
  });

  return (
    <points geometry={geometry}>
      <foliageMaterial ref={materialRef} uLightGlow={LIGHT_GLOW_TEXTURE} uGlowReach={GLOW_REACH} />
    </points>
  );
};
