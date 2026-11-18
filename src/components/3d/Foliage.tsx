import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { inSphere } from 'maath/random';
import { CONFIG } from '../../constants/config';
import '../../shaders/FoliageMaterial'; // đăng ký thẻ <foliageMaterial />
import type { FoliageMaterialImpl } from '../../shaders/FoliageMaterial';
import { useStore, useThemeColors } from '../../store';
import type { TreeStyle } from '../../types';
import { sampleFoliagePoint } from '../../utils/treePositions';
import { damping } from './shared/motion';

const CHAOS_RADIUS = 42;
/** Tốc độ chuyển giữa CHAOS và FORMED (càng lớn càng nhanh). */
const MORPH_SPEED = 1.5;
/** Tốc độ chuyển giữa hai kiểu cây. */
const STYLE_SPEED = 3;
const COLOR_SPEED = 2;

/**
 * Geometry cho các hạt lá: vị trí tán loạn, vị trí trên cây (cũ + mới, điền sau; thành phần thứ 4 là độ sáng
 * của hạt) và một số ngẫu nhiên cho kích thước, hướng lá.
 */
const createFoliageGeometry = (count: number) => {
  const geometry = new THREE.BufferGeometry();
  const chaos = inSphere(new Float32Array(count * 3), { radius: CHAOS_RADIUS });
  geometry.setAttribute('position', new THREE.BufferAttribute(chaos, 3));
  geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  geometry.setAttribute('aPrevTargetPos', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(Float32Array.from({ length: count }, Math.random), 1));
  return geometry;
};

/**
 * Đặt lại vị trí trên cây của mọi hạt theo kiểu cây mới. Vị trí hiện tại của từng hạt (đang ở `styleMix`
 * trên đường từ vị trí cũ sang vị trí mới) được giữ làm điểm xuất phát, nên đổi kiểu giữa chừng không bị giật.
 */
const retargetFoliage = (geometry: THREE.BufferGeometry, style: TreeStyle, styleMix: number) => {
  const prev = geometry.getAttribute('aPrevTargetPos') as THREE.BufferAttribute;
  const target = geometry.getAttribute('aTargetPos') as THREE.BufferAttribute;
  const from = new THREE.Vector4();
  const to = new THREE.Vector4();
  const point = new THREE.Vector3();

  for (let i = 0; i < target.count; i++) {
    from.fromBufferAttribute(prev, i).lerp(to.fromBufferAttribute(target, i), styleMix);
    prev.setXYZW(i, from.x, from.y, from.z, from.w);
    const shade = sampleFoliagePoint(style, point);
    target.setXYZW(i, point.x, point.y, point.z, shade);
  }
  prev.needsUpdate = true;
  target.needsUpdate = true;
};

/** Tán lá: hàng chục nghìn lá kim vẽ bằng một Points; toàn bộ chuyển động chạy trên GPU (xem FoliageMaterial). */
export const Foliage = () => {
  const treeStyle = useStore((s) => s.treeStyle);
  const { primary } = useThemeColors();
  const materialRef = useRef<FoliageMaterialImpl>(null);
  const geometry = useMemo(() => createFoliageGeometry(CONFIG.counts.foliage), []);
  const targetColor = useMemo(() => new THREE.Color(primary), [primary]);

  useLayoutEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    retargetFoliage(geometry, treeStyle, material.uStyleMix);
    material.uStyleMix = 0;
  }, [geometry, treeStyle]);

  useFrame(({ clock, size, viewport }, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const isFormed = useStore.getState().sceneState === 'FORMED';
    material.uTime = clock.elapsedTime;
    material.uViewportHeight = size.height * viewport.dpr;
    material.uProgress = THREE.MathUtils.damp(material.uProgress, isFormed ? 1 : 0, MORPH_SPEED, delta);
    material.uStyleMix = THREE.MathUtils.damp(material.uStyleMix, 1, STYLE_SPEED, delta);
    material.uColor.lerp(targetColor, damping(COLOR_SPEED, delta));
  });

  return (
    <points geometry={geometry}>
      <foliageMaterial ref={materialRef} />
    </points>
  );
};
