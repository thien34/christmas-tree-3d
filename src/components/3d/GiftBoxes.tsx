import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { pickColor } from '../../constants/themes';
import type { SceneState, ThemeColors, TreeStyle } from '../../types';
import { randomAngle, randomEuler, randomInCube, randomItem, randomRange, randomRotationSpeed } from '../../utils/random';
import { sampleOrnamentPoint } from '../../utils/treePositions';
import { createMorphingItems, moveTowardsState, spin, useTreeTargets, type TreeTargetSampler } from './shared/motion';

/*
 * Mỗi hộp quà gồm 1 khối hộp + 5 mảnh ruy băng/nơ. Thay vì 300 × 6 = 1800 mesh riêng lẻ,
 * dùng 2 InstancedMesh (hộp và ruy băng) nên chỉ tốn 2 draw call.
 */

const RIBBON_PARTS_PER_GIFT = 5;
const MOVE_SPEED = 1.2;
const FLOAT_AMPLITUDE = 0.1;
const SIZE_RANGES: [number, number][] = [
  [0.5, 0.8],
  [0.4, 0.7],
  [0.45, 0.7],
];

const Z_AXIS = new THREE.Vector3(0, 0, 1);

/** Ma trận cục bộ của một mảnh (so với tâm hộp quà). */
const partMatrix = (position: [number, number, number], rotationZ: number, scale: [number, number, number]) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromAxisAngle(Z_AXIS, rotationZ),
    new THREE.Vector3(...scale),
  );

/** Ruy băng dọc, ruy băng ngang, 2 vòng nơ và nút nơ cho hộp cạnh `s`. */
const ribbonPartMatrices = (s: number) => [
  partMatrix([0, 0, 0], 0, [s + 0.1, s, s * 0.2]),
  partMatrix([0, 0, 0], 0, [s * 0.2, s, s + 0.1]),
  partMatrix([-s * 0.25, s / 2, 0], Math.PI / 3, [s * 0.3, s * 0.15, s * 0.05]),
  partMatrix([s * 0.25, s / 2, 0], -Math.PI / 3, [s * 0.3, s * 0.15, s * 0.05]),
  partMatrix([0, s / 2, 0], 0, [s * 0.12, s * 0.12, s * 0.05]),
];

const createGifts = (count: number) =>
  createMorphingItems(count, () => {
    const [minSize, maxSize] = randomItem(SIZE_RANGES);
    const size = randomRange(minSize, maxSize);
    return {
      chaosPos: randomInCube(60),
      rotation: randomEuler(),
      rotationSpeed: randomRotationSpeed(0.5),
      floatOffset: randomAngle(),
      colorSeed: Math.random(),
      boxMatrix: new THREE.Matrix4().makeScale(size, size, size),
      ribbonMatrices: ribbonPartMatrices(size),
    };
  });

const sampleGiftTarget: TreeTargetSampler = (style, _index, _count, out) =>
  sampleOrnamentPoint(style, out).multiplyScalar(0.95);

// Biến tạm dùng lại mỗi khung hình
const giftMatrix = new THREE.Matrix4();
const instanceMatrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const unitScale = new THREE.Vector3(1, 1, 1);
const color = new THREE.Color();

interface GiftBoxesProps {
  state: SceneState;
  themeColors: ThemeColors;
  treeStyle: TreeStyle;
}

export const GiftBoxes = ({ state, themeColors, treeStyle }: GiftBoxesProps) => {
  const count = CONFIG.counts.gifts;
  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const ribbonsRef = useRef<THREE.InstancedMesh>(null);

  const gifts = useMemo(() => createGifts(count), [count]);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useTreeTargets(gifts, treeStyle, sampleGiftTarget);

  // Tô màu từng hộp theo theme (ruy băng đổi màu qua prop `color` bên dưới)
  useLayoutEffect(() => {
    const boxes = boxesRef.current;
    if (!boxes) return;
    gifts.forEach((gift, i) => boxes.setColorAt(i, color.set(pickColor(themeColors.giftColors, gift.colorSeed))));
    if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true;
  }, [gifts, themeColors.giftColors]);

  useFrame(({ clock }, delta) => {
    const boxes = boxesRef.current;
    const ribbons = ribbonsRef.current;
    if (!boxes || !ribbons) return;

    gifts.forEach((gift, i) => {
      moveTowardsState(gift, state, MOVE_SPEED, delta);
      spin(gift.rotation, gift.rotationSpeed, delta);

      position.copy(gift.currentPos);
      if (state === 'FORMED') {
        position.y += Math.sin(clock.elapsedTime * 2 + gift.floatOffset) * FLOAT_AMPLITUDE;
      }
      giftMatrix.compose(position, quaternion.setFromEuler(gift.rotation), unitScale);

      boxes.setMatrixAt(i, instanceMatrix.multiplyMatrices(giftMatrix, gift.boxMatrix));
      gift.ribbonMatrices.forEach((part, j) => {
        ribbons.setMatrixAt(i * RIBBON_PARTS_PER_GIFT + j, instanceMatrix.multiplyMatrices(giftMatrix, part));
      });
    });

    boxes.instanceMatrix.needsUpdate = true;
    ribbons.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={boxesRef}
        args={[geometry, undefined, count]}
        frustumCulled={false}
        castShadow
        receiveShadow>
        <meshStandardMaterial roughness={0.3} metalness={0.1} />
      </instancedMesh>
      <instancedMesh
        ref={ribbonsRef}
        args={[geometry, undefined, count * RIBBON_PARTS_PER_GIFT]}
        frustumCulled={false}
        castShadow
        receiveShadow>
        <meshStandardMaterial color={themeColors.gold} roughness={0.15} metalness={1} />
      </instancedMesh>
    </>
  );
};
