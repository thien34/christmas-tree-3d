import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BASS_CHANNEL, pulse } from '../../audio/music';
import { CONFIG } from '../../constants/config';
import { pickColor } from '../../constants/themes';
import { useStore, useThemeColors } from '../../store';
import { randomAngle, randomEuler, randomInCube, randomRange, randomRotationSpeed } from '../../utils/random';
import { sampleOrnamentPoint } from '../../utils/treePositions';
import { createMorphingItems, moveTowardsState, spin } from './shared/motion';
import { createStarShape } from './TopStar';

/*
 * Đồ trang trí treo thêm bên cạnh quả cầu: kẹo gậy sọc, chuông và ngôi sao nhỏ.
 * Mỗi loại một InstancedMesh (1 draw call). Như hộp quà: lộn nhào khi tán loạn, khi thành cây thì xoay về tư thế treo
 * thẳng đứng và đung đưa nhẹ; có nhạc thì đung đưa mạnh hơn theo phách.
 */

const MOVE_SPEED = 1.4;
const SETTLE_SPEED = 2.5;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);

/* ---------- Hình dạng ---------- */

/** Kẹo gậy: thân thẳng, đầu uốn móc câu; toạ độ u của ống chạy dọc thân để vẽ sọc. */
const createCandyCaneGeometry = () => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 8; i++) points.push(new THREE.Vector3(0, -0.6 + (0.85 * i) / 8, 0));
  const hook = 0.17;
  for (let i = 1; i <= 16; i++) {
    const a = Math.PI - (Math.PI * i) / 16;
    points.push(new THREE.Vector3(hook + hook * Math.cos(a), 0.25 + hook * Math.sin(a), 0));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.05, 8).center();
};

/** Chuông: tiện tròn từ đường viền, miệng loe ở dưới. */
const createBellGeometry = () => {
  const profile = [
    [0, 0.36],
    [0.07, 0.36],
    [0.11, 0.31],
    [0.14, 0.18],
    [0.18, 0.02],
    [0.26, -0.14],
    [0.33, -0.22],
    [0.34, -0.26],
    [0.3, -0.26],
    [0, -0.22],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(profile, 20);
};

const createMiniStarGeometry = () =>
  new THREE.ExtrudeGeometry(createStarShape(5, 0.34, 0.15), {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  }).center();

/** Sọc chéo hai màu, lặp liền mạch (chu kỳ sọc chia hết kích thước ảnh). */
const createStripeTexture = (stripe: string) => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f7f3ea';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = stripe;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if ((x + y) % 32 < 12) ctx.fillRect(x, y, 1, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 1);
  return texture;
};

/* ---------- Một bộ đồ trang trí ---------- */

const createDecor = (count: number, sizeRange: [number, number]) =>
  createMorphingItems(count, () => ({
    chaosPos: randomInCube(60),
    targetPos: sampleOrnamentPoint(),
    rotation: randomEuler(),
    rotationSpeed: randomRotationSpeed(1),
    upright: new THREE.Quaternion().setFromAxisAngle(Y_AXIS, randomAngle()),
    settled: 0,
    size: randomRange(...sizeRange),
    colorSeed: Math.random(),
    swingPhase: randomAngle(),
    swingSpeed: randomRange(1.2, 2.2),
  }));

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const swingQuaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();
const color = new THREE.Color();

interface DecorSetProps {
  geometry: THREE.BufferGeometry;
  count: number;
  sizeRange: [number, number];
  /** Biên độ đung đưa (rad) khi đã treo trên cây. */
  swing: number;
  /** Bảng màu tô từng món; bỏ trống thì dùng màu của vật liệu. */
  palette?: readonly string[];
  children: ReactNode;
}

const DecorSet = ({ geometry, count, sizeRange, swing, palette, children }: DecorSetProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => createDecor(count, sizeRange), [count, sizeRange]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !palette) return;
    items.forEach((item, i) => mesh.setColorAt(i, color.set(pickColor(palette, item.colorSeed))));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, palette]);

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { sceneState } = useStore.getState();
    const beat = pulse(BASS_CHANNEL);
    const time = clock.elapsedTime;

    items.forEach((item, i) => {
      moveTowardsState(item, sceneState, MOVE_SPEED, delta);
      spin(item.rotation, item.rotationSpeed, delta);
      item.settled = THREE.MathUtils.damp(item.settled, sceneState === 'FORMED' ? 1 : 0, SETTLE_SPEED, delta);
      const angle = swing * (1 + 1.5 * beat) * Math.sin(time * item.swingSpeed + item.swingPhase);
      swingQuaternion.copy(item.upright).multiply(quaternion.setFromAxisAngle(X_AXIS, angle));
      quaternion.setFromEuler(item.rotation).slerp(swingQuaternion, item.settled);
      mesh.setMatrixAt(i, matrix.compose(item.currentPos, quaternion, scale.setScalar(item.size)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} frustumCulled={false}>
      {children}
    </instancedMesh>
  );
};

/* ---------- Ghép lại ---------- */

const CANE_SIZE: [number, number] = [0.9, 1.25];
const BELL_SIZE: [number, number] = [0.9, 1.3];
const STAR_SIZE: [number, number] = [0.8, 1.2];

export const DecorOrnaments = () => {
  const theme = useThemeColors();
  const geometries = useMemo(
    () => ({ cane: createCandyCaneGeometry(), bell: createBellGeometry(), star: createMiniStarGeometry() }),
    [],
  );
  const stripes = useMemo(() => createStripeTexture(theme.ornamentColors[0]), [theme.ornamentColors]);
  useEffect(() => () => stripes.dispose(), [stripes]);
  /** Ngôi sao nhỏ: ánh kim của theme và màu sáng trung tính. */
  const starPalette = useMemo(() => [theme.gold, theme.ornamentColors[2]], [theme.gold, theme.ornamentColors]);

  return (
    <>
      <DecorSet geometry={geometries.cane} count={CONFIG.counts.candyCanes} sizeRange={CANE_SIZE} swing={0.12}>
        <meshStandardMaterial map={stripes} roughness={0.35} metalness={0.05} />
      </DecorSet>
      <DecorSet geometry={geometries.bell} count={CONFIG.counts.bells} sizeRange={BELL_SIZE} swing={0.25}>
        <meshStandardMaterial color={theme.gold} roughness={0.22} metalness={0.95} side={THREE.DoubleSide} />
      </DecorSet>
      <DecorSet
        geometry={geometries.star}
        count={CONFIG.counts.miniStars}
        sizeRange={STAR_SIZE}
        swing={0.18}
        palette={starPalette}
      >
        <meshStandardMaterial roughness={0.3} metalness={0.8} emissive={theme.gold} emissiveIntensity={0.25} />
      </DecorSet>
    </>
  );
};
