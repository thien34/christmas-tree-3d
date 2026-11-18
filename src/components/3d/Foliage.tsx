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

const CHAOS_RADIUS = 30;
/** Tốc độ chuyển giữa CHAOS và FORMED (càng lớn càng nhanh). */
const MORPH_SPEED = 1.5;
/** Tốc độ chuyển giữa hai kiểu cây. */
const STYLE_SPEED = 3;
const COLOR_SPEED = 2;

const vec3Attribute = (values: THREE.TypedArray) => new THREE.BufferAttribute(values, 3);

/** Geometry cho các hạt lá: vị trí tán loạn, vị trí trên cây (cũ + mới, điền sau) và một số ngẫu nhiên cho kích thước. */
const createFoliageGeometry = (count: number) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', vec3Attribute(inSphere(new Float32Array(count * 3), { radius: CHAOS_RADIUS })));
  geometry.setAttribute('aTargetPos', vec3Attribute(new Float32Array(count * 3)));
  geometry.setAttribute('aPrevTargetPos', vec3Attribute(new Float32Array(count * 3)));
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
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();

  for (let i = 0; i < target.count; i++) {
    from.fromBufferAttribute(prev, i).lerp(to.fromBufferAttribute(target, i), styleMix);
    prev.setXYZ(i, from.x, from.y, from.z);
    sampleFoliagePoint(style, to);
    target.setXYZ(i, to.x, to.y, to.z);
  }
  prev.needsUpdate = true;
  target.needsUpdate = true;
};

/** 25.000 hạt lá cây vẽ bằng một Points; toàn bộ chuyển động chạy trên GPU (xem FoliageMaterial). */
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

  useFrame(({ clock }, delta) => {
    const material = materialRef.current;
    if (!material) return;
    const isFormed = useStore.getState().sceneState === 'FORMED';
    material.uTime = clock.elapsedTime;
    material.uProgress = THREE.MathUtils.damp(material.uProgress, isFormed ? 1 : 0, MORPH_SPEED, delta);
    material.uStyleMix = THREE.MathUtils.damp(material.uStyleMix, 1, STYLE_SPEED, delta);
    material.uColor.lerp(targetColor, damping(COLOR_SPEED, delta));
  });

  return (
    <points geometry={geometry}>
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};
