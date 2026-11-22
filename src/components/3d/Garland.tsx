import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BASS_CHANNEL, pulse } from '../../audio/music';
import { CONFIG } from '../../constants/config';
import { useThemeColors } from '../../store';
import { formation } from './shared/formation';

/*
 * Chuỗi hạt kim tuyến quấn xoắn quanh cây từ gốc lên ngọn, võng xuống thành từng vòng giữa các cành.
 * Vẽ bằng một InstancedMesh; các hạt xếp theo thứ tự từ gốc lên ngọn nên chỉ cần đổi `mesh.count` là chuỗi
 * "quấn dần" lên cây khi thành hình. Một vệt sáng chạy dọc chuỗi, có nhạc thì loé theo phách mạnh.
 */

const { height: HEIGHT, radius: RADIUS } = CONFIG.tree;
const TURNS = 5;
/** Số đoạn võng xuống trên mỗi vòng quấn. */
const SWAGS_PER_TURN = 6;
const BEAD_SPACING = 0.27;
const BEAD_RADIUS = 0.1;
/** Khoảng chiều cao chuỗi quấn (0 = gốc tán, 1 = đỉnh). */
const SPAN = { from: 0.05, to: 0.88 };

interface Bead {
  position: THREE.Vector3;
  /** Vị trí dọc chuỗi, 0 = đầu dưới, 1 = đầu trên. */
  s: number;
  scale: number;
}

/** Điểm trên chuỗi tại tham số `s` (0–1): xoắn ốc trên mặt tán, võng xuống giữa hai điểm móc. */
const garlandPoint = (s: number, out: THREE.Vector3) => {
  const t = SPAN.from + (SPAN.to - SPAN.from) * s;
  const theta = s * TURNS * Math.PI * 2;
  const swag = (theta / ((Math.PI * 2) / SWAGS_PER_TURN)) % 1;
  // Ngoài mép tán một chút để hạt nằm trên lá chứ không chìm vào trong
  const radius = RADIUS * (1 - t) * 0.97 + 0.35;
  const sag = 0.75 * (1 - t * 0.6) * Math.sin(swag * Math.PI);
  return out.set(radius * Math.cos(theta), (t - 0.5) * HEIGHT - 0.1 - sag, radius * Math.sin(theta));
};

/** Rải hạt đều theo chiều dài chuỗi (đi từng bước nhỏ, đủ BEAD_SPACING thì đặt một hạt). */
const createBeads = (): Bead[] => {
  const beads: Bead[] = [];
  const previous = garlandPoint(0, new THREE.Vector3());
  const point = new THREE.Vector3();
  let travelled = BEAD_SPACING;
  const steps = 20000;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    garlandPoint(s, point);
    travelled += point.distanceTo(previous);
    previous.copy(point);
    if (travelled < BEAD_SPACING) continue;
    travelled = 0;
    // Cứ 5 hạt thì có một hạt to
    beads.push({ position: point.clone(), s, scale: beads.length % 5 === 0 ? 1.7 : 1 });
  }
  return beads;
};

const BEADS = createBeads();
/** Chuỗi bắt đầu quấn khi tiến độ thành cây quá mức này và quấn xong ở mức REVEAL_END. */
const REVEAL_START = 0.45;
const REVEAL_END = 0.97;

const matrix = new THREE.Matrix4();
const color = new THREE.Color();

export const Garland = () => {
  const { gold } = useThemeColors();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const baseColor = useMemo(() => new THREE.Color(gold), [gold]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    BEADS.forEach((bead, i) => {
      const size = BEAD_RADIUS * bead.scale;
      mesh.setMatrixAt(i, matrix.makeScale(size, size, size).setPosition(bead.position));
      mesh.setColorAt(i, color.set('#ffffff')); // tạo sẵn instanceColor để shader không phải dịch lại về sau
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const reveal = THREE.MathUtils.clamp((formation.progress - REVEAL_START) / (REVEAL_END - REVEAL_START), 0, 1);
    mesh.count = Math.floor(BEADS.length * reveal);
    mesh.visible = mesh.count > 0;
    if (!mesh.visible) return;

    const beat = pulse(BASS_CHANNEL);
    const time = clock.elapsedTime;
    for (let i = 0; i < mesh.count; i++) {
      // Vệt sáng chạy từ gốc lên ngọn
      const wave = Math.pow(0.5 + 0.5 * Math.sin(BEADS[i].s * 40 - time * 2.5), 12);
      mesh.setColorAt(i, color.copy(baseColor).multiplyScalar(0.85 + 1.4 * wave + 0.8 * beat));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BEADS.length]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial roughness={0.2} metalness={0.95} />
    </instancedMesh>
  );
};
