import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { pickColor } from '../../constants/themes';
import { useStore, useThemeColors } from '../../store';
import { randomAngle, randomEuler, randomInCube, randomRange, randomRotationSpeed } from '../../utils/random';
import { GROUND_Y, sampleGiftSpot } from '../../utils/treePositions';
import { createMorphingItems, moveTowardsState, spin } from './shared/motion';
import { SOFT_SPOT_TEXTURE } from './shared/softSpot';

/*
 * Hộp quà: bay lượn khi tán loạn, xếp ngay ngắn trên mặt đất quanh gốc cây khi cây thành hình.
 * Mỗi hộp gồm 1 khối hộp + 5 mảnh ruy băng/nơ, vẽ bằng 2 InstancedMesh (hộp và ruy băng) nên chỉ tốn 2 draw call.
 */

const RIBBON_PARTS_PER_GIFT = 5;
const MOVE_SPEED = 1.2;
/** Tốc độ hộp quà xoay về tư thế đứng thẳng khi đáp xuống đất. */
const SETTLE_SPEED = 2.5;
const SIZE_RANGE = { min: 1, max: 2 };

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
/** Khối hộp 1×1×1 dùng chung cho hộp quà và mọi mảnh ruy băng (kích thước nằm trong ma trận từng instance). */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
/** Bóng đổ giả: tấm vuông nằm sát mặt đất, tô đốm tròn mềm. */
const SHADOW_PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
/** Bóng rộng gấp chừng này lần cạnh hộp. */
const SHADOW_SIZE = 2;

/** Ma trận cục bộ của một mảnh (so với tâm hộp quà). */
const partMatrix = (position: [number, number, number], rotationZ: number, scale: [number, number, number]) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromAxisAngle(Z_AXIS, rotationZ),
    new THREE.Vector3(...scale),
  );

/** Ruy băng dọc, ruy băng ngang, 2 vòng nơ và nút nơ cho hộp cạnh `s`. */
const ribbonPartMatrices = (s: number) => [
  partMatrix([0, 0, 0], 0, [s + 0.05, s + 0.05, s * 0.18]),
  partMatrix([0, 0, 0], 0, [s * 0.18, s + 0.05, s + 0.05]),
  partMatrix([-s * 0.2, s / 2 + s * 0.05, 0], Math.PI / 3, [s * 0.3, s * 0.15, s * 0.08]),
  partMatrix([s * 0.2, s / 2 + s * 0.05, 0], -Math.PI / 3, [s * 0.3, s * 0.15, s * 0.08]),
  partMatrix([0, s / 2 + s * 0.03, 0], 0, [s * 0.12, s * 0.12, s * 0.1]),
];

const createGifts = (count: number) =>
  createMorphingItems(count, (index) => {
    const size = randomRange(SIZE_RANGE.min, SIZE_RANGE.max);
    const targetPos = sampleGiftSpot(index, count);
    targetPos.y += size / 2; // đáy hộp chạm đất
    return {
      chaosPos: randomInCube(60),
      targetPos,
      rotation: randomEuler(),
      rotationSpeed: randomRotationSpeed(0.5),
      /** Tư thế khi nằm trên đất: đứng thẳng, quay một góc bất kỳ. */
      upright: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, randomAngle()),
      /** 0 = đang lộn nhào tự do, 1 = đã nằm yên trên đất. */
      settled: 0,
      colorSeed: Math.random(),
      size,
      boxMatrix: new THREE.Matrix4().makeScale(size, size, size),
      ribbonMatrices: ribbonPartMatrices(size),
    };
  });

// Biến tạm dùng lại mỗi khung hình
const giftMatrix = new THREE.Matrix4();
const instanceMatrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const unitScale = new THREE.Vector3(1, 1, 1);
const color = new THREE.Color();

export const GiftBoxes = () => {
  const count = CONFIG.counts.gifts;
  const themeColors = useThemeColors();
  const boxesRef = useRef<THREE.InstancedMesh>(null);
  const ribbonsRef = useRef<THREE.InstancedMesh>(null);
  const shadowsRef = useRef<THREE.InstancedMesh>(null);

  const gifts = useMemo(() => createGifts(count), [count]);

  // Tô màu từng hộp theo theme (ruy băng đổi màu qua prop `color` bên dưới)
  useLayoutEffect(() => {
    const boxes = boxesRef.current;
    if (!boxes) return;
    gifts.forEach((gift, i) => boxes.setColorAt(i, color.set(pickColor(themeColors.giftColors, gift.colorSeed))));
    if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true;
  }, [gifts, themeColors.giftColors]);

  useFrame((_, delta) => {
    const boxes = boxesRef.current;
    const ribbons = ribbonsRef.current;
    const shadows = shadowsRef.current;
    if (!boxes || !ribbons || !shadows) return;
    const { sceneState } = useStore.getState();

    gifts.forEach((gift, i) => {
      moveTowardsState(gift, sceneState, MOVE_SPEED, delta);
      spin(gift.rotation, gift.rotationSpeed, delta);
      gift.settled = THREE.MathUtils.damp(gift.settled, sceneState === 'FORMED' ? 1 : 0, SETTLE_SPEED, delta);

      quaternion.setFromEuler(gift.rotation).slerp(gift.upright, gift.settled);
      giftMatrix.compose(gift.currentPos, quaternion, unitScale);

      boxes.setMatrixAt(i, instanceMatrix.multiplyMatrices(giftMatrix, gift.boxMatrix));
      gift.ribbonMatrices.forEach((part, j) => {
        ribbons.setMatrixAt(i * RIBBON_PARTS_PER_GIFT + j, instanceMatrix.multiplyMatrices(giftMatrix, part));
      });
      // Bóng chỉ hiện khi hộp đã đáp xuống đất (scale theo `settled`, kèm chút nhỏ lại khi hộp còn ở trên cao)
      const lift = Math.max(0, gift.currentPos.y - gift.targetPos.y);
      const shadowScale = gift.size * SHADOW_SIZE * gift.settled * Math.max(0, 1 - lift / 6);
      shadows.setMatrixAt(
        i,
        instanceMatrix.makeScale(shadowScale, 1, shadowScale).setPosition(gift.currentPos.x, GROUND_Y + 0.03, gift.currentPos.z),
      );
    });
    shadows.instanceMatrix.needsUpdate = true;

    boxes.instanceMatrix.needsUpdate = true;
    ribbons.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={boxesRef} args={[UNIT_BOX, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial roughness={0.55} metalness={0} />
      </instancedMesh>
      <instancedMesh ref={ribbonsRef} args={[UNIT_BOX, undefined, count * RIBBON_PARTS_PER_GIFT]} frustumCulled={false}>
        <meshStandardMaterial color={themeColors.gold} roughness={0.3} metalness={0.8} />
      </instancedMesh>
      {/* renderOrder nằm giữa nền tuyết (-1) và các lớp hạt trong suốt (0) */}
      <instancedMesh ref={shadowsRef} args={[SHADOW_PLANE, undefined, count]} frustumCulled={false} renderOrder={-0.5}>
        <meshBasicMaterial color="#000000" map={SOFT_SPOT_TEXTURE} transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
    </>
  );
};
