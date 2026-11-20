import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { pickColor } from '../../constants/themes';
import { useStore, useThemeColors } from '../../store';
import { randomAngle, randomInCube, randomRange } from '../../utils/random';
import { sampleOrnamentPoint } from '../../utils/treePositions';
import { createMorphingItems, moveTowardsState } from './shared/motion';

/*
 * Các quả cầu (số lượng trong CONFIG.counts.ornaments) vẽ bằng một InstancedMesh (1 draw call).
 * Lấp lánh = nhân màu instance lên > 1 để Bloom bắt sáng, kèm phóng to nhẹ và ngả sang ánh vàng.
 */

const MOVE_SPEED = 1.5;
/** Tỉ lệ quả cầu có hiệu ứng lấp lánh vàng. */
const SPARKLE_CHANCE = 0.25;
/** Lúc lấp lánh mạnh nhất, quả cầu sáng gấp (1 + SPARKLE_GLOW) lần bình thường. */
const SPARKLE_GLOW = 1.5;
/** Bán kính quả cầu: đủ nhỏ để điểm xuyết cho tán lá chứ không che hết lá. */
const RADIUS_RANGE = { min: 0.3, max: 0.52 };

interface Sparkle {
  speed: number;
  phase: number;
  /** Thời gian lấp lánh và thời gian nghỉ của mỗi chu kỳ (giây). */
  duration: number;
  cooldown: number;
  startTime: number;
}

const createSparkle = (): Sparkle => {
  const cooldown = randomRange(3, 8);
  return {
    speed: randomRange(1.5, 3),
    phase: randomAngle(),
    duration: randomRange(1.5, 3.5),
    cooldown,
    startTime: Math.random() * cooldown,
  };
};

const createBalls = (count: number) =>
  createMorphingItems(count, () => ({
    chaosPos: randomInCube(60),
    targetPos: sampleOrnamentPoint(),
    scale: randomRange(RADIUS_RANGE.min, RADIUS_RANGE.max),
    colorSeed: Math.random(),
    sparkle: Math.random() < SPARKLE_CHANCE ? createSparkle() : null,
  }));

/** Độ lấp lánh 0–1 tại thời điểm `time`, hoặc 0 nếu đang trong lúc nghỉ. */
const sparkleAmount = (sparkle: Sparkle, time: number) => {
  const cycleTime = (time - sparkle.startTime) % (sparkle.duration + sparkle.cooldown);
  if (cycleTime >= sparkle.duration) return 0;
  return (Math.sin(time * sparkle.speed + sparkle.phase) + 1) / 2;
};

// Biến tạm dùng lại mỗi khung hình
const matrix = new THREE.Matrix4();
const color = new THREE.Color();

/** Các quả cầu kim loại treo trên cây; khoảng 1/4 số quả thỉnh thoảng lấp lánh ánh vàng khi cây đã thành hình. */
export const ChristmasBalls = () => {
  const count = CONFIG.counts.ornaments;
  const themeColors = useThemeColors();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const balls = useMemo(() => createBalls(count), [count]);
  const gold = useMemo(() => new THREE.Color(themeColors.gold), [themeColors.gold]);
  const baseColors = useMemo(
    () => balls.map((ball) => new THREE.Color(pickColor(themeColors.ornamentColors, ball.colorSeed))),
    [balls, themeColors.ornamentColors],
  );

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { sceneState } = useStore.getState();

    balls.forEach((ball, i) => {
      moveTowardsState(ball, sceneState, MOVE_SPEED, delta);
      const sparkle = sceneState === 'FORMED' && ball.sparkle ? sparkleAmount(ball.sparkle, clock.elapsedTime) : 0;
      const scale = ball.scale * (1 + sparkle * 0.3);

      mesh.setMatrixAt(i, matrix.makeScale(scale, scale, scale).setPosition(ball.currentPos));
      mesh.setColorAt(
        i,
        color
          .copy(baseColors[i])
          .lerp(gold, sparkle * 0.8)
          .multiplyScalar(1 + sparkle * SPARKLE_GLOW),
      );
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial roughness={0.25} metalness={0.85} />
    </instancedMesh>
  );
};
