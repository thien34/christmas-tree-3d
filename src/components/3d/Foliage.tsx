import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { inSphere } from 'maath/random';
import { CONFIG } from '../../constants/config';
import '../../shaders/FoliageMaterial'; // đăng ký thẻ <foliageMaterial />
import type { FoliageMaterialImpl } from '../../shaders/FoliageMaterial';
import type { SceneState, ThemeColors, TreeStyle } from '../../types';
import { sampleFoliagePoint } from '../../utils/treePositions';
import { damping } from './shared/motion';

const CHAOS_RADIUS = 30;
/** Tốc độ chuyển giữa CHAOS và FORMED (càng lớn càng nhanh). */
const MORPH_SPEED = 1.5;
const COLOR_SPEED = 2;

/** Tạo geometry cho các hạt lá: vị trí tán loạn, vị trí trên cây (điền sau) và một số ngẫu nhiên cho kích thước. */
const createFoliageGeometry = (count: number) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(inSphere(new Float32Array(count * 3), { radius: CHAOS_RADIUS }), 3),
  );
  geometry.setAttribute('aTargetPos', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(Float32Array.from({ length: count }, Math.random), 1));
  return geometry;
};

/** Ghi lại vị trí trên cây của mọi hạt theo kiểu cây. */
const fillTreeTargets = (attribute: THREE.BufferAttribute, style: TreeStyle) => {
  const point = new THREE.Vector3();
  for (let i = 0; i < attribute.count; i++) {
    sampleFoliagePoint(style, point);
    attribute.setXYZ(i, point.x, point.y, point.z);
  }
  attribute.needsUpdate = true;
};

interface FoliageProps {
  state: SceneState;
  themeColors: ThemeColors;
  treeStyle: TreeStyle;
}

/** 25.000 hạt lá cây vẽ bằng một Points; toàn bộ chuyển động chạy trên GPU (xem FoliageMaterial). */
export const Foliage = ({ state, themeColors, treeStyle }: FoliageProps) => {
  const materialRef = useRef<FoliageMaterialImpl>(null);
  const geometry = useMemo(() => createFoliageGeometry(CONFIG.counts.foliage), []);
  const targetColor = useMemo(() => new THREE.Color(themeColors.primary), [themeColors.primary]);

  useLayoutEffect(() => {
    fillTreeTargets(geometry.getAttribute('aTargetPos') as THREE.BufferAttribute, treeStyle);
  }, [geometry, treeStyle]);

  useFrame(({ clock }, delta) => {
    const material = materialRef.current;
    if (!material) return;
    material.uTime = clock.elapsedTime;
    material.uProgress = THREE.MathUtils.damp(material.uProgress, state === 'FORMED' ? 1 : 0, MORPH_SPEED, delta);
    material.uColor.lerp(targetColor, damping(COLOR_SPEED, delta));
  });

  return (
    <points geometry={geometry}>
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};
