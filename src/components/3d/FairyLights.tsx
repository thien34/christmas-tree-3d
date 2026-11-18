import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../constants/config';
import { pickColor } from '../../constants/themes';
import type { SceneState, ThemeColors, TreeStyle } from '../../types';
import { randomRange } from '../../utils/random';
import { sampleLightPoint, sampleShellPoint } from '../../utils/treePositions';
import { createMorphingItems, moveTowardsState, useTreeTargets } from './shared/motion';

/*
 * 400 bóng đèn vẽ bằng một InstancedMesh (1 draw call).
 * Độ sáng được nhân thẳng vào màu từng instance; toneMapped={false} cho phép màu > 1 để Bloom bắt sáng.
 */

const BULB_RADIUS = 0.12;
const MOVE_SPEED = 2;
/** Khi đã thành cây, đèn nhấp nháy với độ sáng trong khoảng này. */
const MIN_GLOW = 3;
const MAX_GLOW = 7;

const createLights = (count: number) =>
  createMorphingItems(count, () => ({
    chaosPos: sampleShellPoint(40),
    blinkSpeed: randomRange(2, 5),
    blinkOffset: Math.random() * 100,
    colorSeed: Math.random(),
  }));

// Biến tạm dùng lại mỗi khung hình
const matrix = new THREE.Matrix4();
const color = new THREE.Color();

interface FairyLightsProps {
  state: SceneState;
  themeColors: ThemeColors;
  treeStyle: TreeStyle;
}

export const FairyLights = ({ state, themeColors, treeStyle }: FairyLightsProps) => {
  const count = CONFIG.counts.lights;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const lights = useMemo(() => createLights(count), [count]);
  const geometry = useMemo(() => new THREE.SphereGeometry(BULB_RADIUS, 8, 8), []);
  const baseColors = useMemo(
    () => lights.map((light) => new THREE.Color(pickColor(themeColors.lights, light.colorSeed))),
    [lights, themeColors.lights],
  );
  useTreeTargets(lights, treeStyle, sampleLightPoint);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const isFormed = state === 'FORMED';

    lights.forEach((light, i) => {
      moveTowardsState(light, state, MOVE_SPEED, delta);
      mesh.setMatrixAt(i, matrix.makeTranslation(light.currentPos));

      const blink = (Math.sin(clock.elapsedTime * light.blinkSpeed + light.blinkOffset) + 1) / 2;
      const glow = isFormed ? THREE.MathUtils.lerp(MIN_GLOW, MAX_GLOW, blink) : 1;
      mesh.setColorAt(i, color.copy(baseColors[i]).multiplyScalar(glow));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
