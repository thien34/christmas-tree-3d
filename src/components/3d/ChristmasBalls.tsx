import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { pickColor } from '../../constants/themes';
import type { SceneState, ThemeColors, TreeStyle } from '../../types';
import { randomAngle, randomEuler, randomInCube, randomItem, randomRange, randomRotationSpeed } from '../../utils/random';
import { sampleOrnamentPoint } from '../../utils/treePositions';
import { createMorphingItems, moveTowardsState, spin, useTreeTargets, type TreeTargetSampler } from './shared/motion';

const MOVE_SPEED = 1.5;
const BASE_EMISSIVE = 0.5;
/** Tỉ lệ quả cầu có hiệu ứng lấp lánh vàng. */
const SPARKLE_CHANCE = 0.25;
const SCALE_RANGES: [number, number][] = [
  [0.5, 0.8],
  [0.4, 0.7],
  [0.45, 0.7],
];

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
  createMorphingItems(count, () => {
    const [minScale, maxScale] = randomItem(SCALE_RANGES);
    return {
      chaosPos: randomInCube(60),
      rotation: randomEuler(),
      rotationSpeed: randomRotationSpeed(1),
      scale: randomRange(minScale, maxScale),
      colorSeed: Math.random(),
      sparkle: Math.random() < SPARKLE_CHANCE ? createSparkle() : null,
    };
  });

/** Độ lấp lánh 0–1 tại thời điểm `time`, hoặc 0 nếu đang trong lúc nghỉ. */
const sparkleAmount = (sparkle: Sparkle, time: number) => {
  const cycleTime = (time - sparkle.startTime) % (sparkle.duration + sparkle.cooldown);
  if (cycleTime >= sparkle.duration) return 0;
  return (Math.sin(time * sparkle.speed + sparkle.phase) + 1) / 2;
};

type BallMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

const sampleBallTarget: TreeTargetSampler = (style, _index, _count, out) =>
  sampleOrnamentPoint(style, out).multiplyScalar(0.95);

interface ChristmasBallsProps {
  state: SceneState;
  themeColors: ThemeColors;
  treeStyle: TreeStyle;
}

/** Các quả cầu kim loại treo trên cây; khoảng 1/4 số quả thỉnh thoảng lấp lánh ánh vàng. */
export const ChristmasBalls = ({ state, themeColors, treeStyle }: ChristmasBallsProps) => {
  const count = CONFIG.counts.ornaments;
  const meshRefs = useRef<(BallMesh | null)[]>([]);

  const balls = useMemo(() => createBalls(count), [count]);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const gold = useMemo(() => new THREE.Color(themeColors.gold), [themeColors.gold]);
  const baseColors = useMemo(
    () => balls.map((ball) => new THREE.Color(pickColor(themeColors.ornamentColors, ball.colorSeed))),
    [balls, themeColors.ornamentColors],
  );
  useTreeTargets(balls, treeStyle, sampleBallTarget);

  // Đổi màu theo theme
  useLayoutEffect(() => {
    meshRefs.current.forEach((mesh, i) => {
      mesh?.material.color.copy(baseColors[i]);
      mesh?.material.emissive.copy(baseColors[i]);
    });
  }, [baseColors]);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;

    balls.forEach((ball, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;

      moveTowardsState(ball, state, MOVE_SPEED, delta);
      mesh.position.copy(ball.currentPos);
      spin(mesh.rotation, ball.rotationSpeed, delta);

      if (state !== 'FORMED') return;

      // Lấp lánh: sáng hơn, to hơn một chút và ánh vàng
      const amount = ball.sparkle ? sparkleAmount(ball.sparkle, time) : 0;
      mesh.scale.setScalar(ball.scale * (1 + amount * 0.3));
      mesh.material.emissiveIntensity = amount > 0 ? 1 + amount * 3 : BASE_EMISSIVE;
      mesh.material.emissive.copy(baseColors[i]).lerp(gold, amount * 0.8);
    });
  });

  return (
    <group>
      {balls.map((ball, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            meshRefs.current[i] = mesh as BallMesh | null;
          }}
          geometry={geometry}
          scale={ball.scale}
          rotation={ball.rotation}>
          <meshStandardMaterial roughness={0.15} metalness={0.9} emissiveIntensity={BASE_EMISSIVE} envMapIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
};
