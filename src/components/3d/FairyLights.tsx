import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MELODY_CHANNELS, isMusicPlaying, pulse } from '../../audio/music';
import { CONFIG } from '../../constants/config';
import { pickColor } from '../../constants/themes';
import { useStore, useThemeColors } from '../../store';
import { randomRange } from '../../utils/random';
import { sampleShellPoint } from '../../utils/treePositions';
import { LIGHT_GLOW_DATA, LIGHT_GLOW_TEXTURE, LIGHT_POSITIONS } from './shared/lightGlow';
import { createMorphingItems, moveTowardsState } from './shared/motion';

/*
 * Các bóng đèn (số lượng trong CONFIG.counts.lights) vẽ bằng một InstancedMesh (1 draw call).
 * Không có nhạc thì mỗi bóng nhấp nháy theo nhịp riêng; có nhạc thì nháy theo từng nốt (xem audio/music.ts).
 * Độ sáng được nhân thẳng vào màu từng instance; toneMapped={false} cho phép màu > 1 để Bloom bắt sáng.
 */

const BULB_RADIUS = 0.14;
const MOVE_SPEED = 2;
/** Khi đã thành cây, đèn nhấp nháy với độ sáng trong khoảng này. */
const MIN_GLOW = 1.5;
const MAX_GLOW = 4;
/**
 * Khi có nhạc: đèn chia thành MELODY_CHANNELS nhóm, mỗi nốt giai điệu làm sáng bừng một nhóm rồi tắt dần,
 * giữa các nốt đèn chỉ còn le lói ở mức MUSIC_REST_GLOW nên nhịp nháy thấy rõ.
 */
const MUSIC_REST_GLOW = 0.5;
const MUSIC_PEAK_GLOW = 5;

const createLights = (count: number) =>
  createMorphingItems(count, (index) => ({
    chaosPos: sampleShellPoint(40),
    // Vị trí dùng chung với lá cây, để lá quanh bóng ửng theo màu đèn (xem shared/lightGlow.ts)
    targetPos: LIGHT_POSITIONS[index].clone(),
    blinkSpeed: randomRange(2, 5),
    blinkOffset: Math.random() * 100,
    colorSeed: Math.random(),
  }));

// Biến tạm dùng lại mỗi khung hình
const matrix = new THREE.Matrix4();
const color = new THREE.Color();
/** Độ sáng theo nhạc của từng nhóm đèn trong khung hình hiện tại. */
const beats = new Array<number>(MELODY_CHANNELS).fill(0);

export const FairyLights = () => {
  const count = CONFIG.counts.lights;
  const themeColors = useThemeColors();
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const lights = useMemo(() => createLights(count), [count]);
  const baseColors = useMemo(
    () => lights.map((light) => new THREE.Color(pickColor(themeColors.lights, light.colorSeed))),
    [lights, themeColors.lights],
  );

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { sceneState } = useStore.getState();
    const isFormed = sceneState === 'FORMED';
    const music = isMusicPlaying();
    for (let ch = 0; ch < MELODY_CHANNELS; ch++) beats[ch] = pulse(ch);

    lights.forEach((light, i) => {
      moveTowardsState(light, sceneState, MOVE_SPEED, delta);
      mesh.setMatrixAt(i, matrix.makeTranslation(light.currentPos));

      let glow: number;
      if (music) {
        const beat = beats[i % MELODY_CHANNELS];
        // Lúc tán loạn vẫn nháy theo nhạc nhưng nhẹ hơn
        glow = isFormed ? THREE.MathUtils.lerp(MUSIC_REST_GLOW, MUSIC_PEAK_GLOW, beat) : 1 + beat * 1.5;
      } else {
        const blink = (Math.sin(clock.elapsedTime * light.blinkSpeed + light.blinkOffset) + 1) / 2;
        glow = isFormed ? THREE.MathUtils.lerp(MIN_GLOW, MAX_GLOW, blink) : 1;
      }
      mesh.setColorAt(i, color.copy(baseColors[i]).multiplyScalar(glow));
      color.toArray(LIGHT_GLOW_DATA, i * 4);
    });
    LIGHT_GLOW_TEXTURE.needsUpdate = true;

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[BULB_RADIUS, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
