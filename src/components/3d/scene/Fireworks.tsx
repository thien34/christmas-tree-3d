import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEMES } from '../../../constants/themes';
import { useStore } from '../../../store';
import { randomItem, randomRange } from '../../../utils/random';
import { GROUND_Y } from '../../../utils/treePositions';

/*
 * Pháo hoa: mỗi quả bay lên từ mặt đất (có vệt đuôi), nổ với một chớp sáng, rồi các tia lửa toả ra, bị không khí
 * hãm lại, rủ xuống theo trọng lực và tắt dần. Mỗi tia lửa vẽ bằng TRAIL điểm nối đuôi nhau (điểm sau đi trễ hơn
 * điểm trước một chút) nên thành một vệt sáng thay vì một chấm.
 * Toàn bộ chuyển động tính trên GPU từ vài thông số ghi một lần lúc bắn; các quả dùng xoay vòng SLOTS "ô" cố định.
 */

/** Số tia lửa mỗi quả, và số điểm vẽ nên vệt của mỗi tia (ít quá thì vệt bị đứt quãng thành nét đứt). */
const SPARKS = 140;
const TRAIL = 12;
const PER_SHELL = SPARKS * TRAIL;
/**
 * Số quả có thể bay cùng lúc. Giữ ✌️ liên tục thì cứ 1.5 giây một loạt VOLLEY_SIZE quả, mỗi quả sống tới ~7 giây
 * (bay lên + cháy + vệt đuôi), nên cần chừng này ô để quả mới không ghi đè quả chưa tắt.
 */
const SLOTS = 14;
const COUNT = SLOTS * PER_SHELL;
const VOLLEY_SIZE = 3;
/** Quả sau bắn cách quả trước khoảng này (giây), xen kẽ hai bên cây. */
const VOLLEY_GAP = { min: 0.35, max: 0.6 };
/** Tốc độ đầu pháo bay lên (đơn vị cảnh / giây). */
const RISE_SPEED = 24;

/**
 * Chỗ nổ, tính theo hướng nhìn của camera để luôn nổ hai bên cây (hoặc trên ngọn), không bị tán lá che dù xoay cảnh:
 * `side` lệch sang hai bên, `depth` lùi ra xa camera hơn cây một chút, `height` theo trục đứng.
 */
const BURST_AREA = { sideMin: 15, sideMax: 27, heightMin: 3, heightMax: 13, depthMin: 4, depthMax: 16 };
/** Nổ trên ngọn: lùi xa hơn để cả quả nằm gọn trong khung hình (camera nhìn từ trên xuống, càng xa càng thấp). */
const ABOVE_TREE = { chance: 0.15, side: 8, heightMin: 15, heightMax: 17, depthMin: 16, depthMax: 26 };

/** Bảng màu pháo hoa: màu rực để nổi trên nền trời đêm, cộng thêm màu vàng của theme đang chọn. */
const VIVID = ['#ff3b3b', '#ff8a1f', '#ffd23b', '#3bff7a', '#3bc8ff', '#5a6bff', '#c66bff', '#ff5ec8', '#ffffff'];
const WILLOW_GOLD = ['#ffb347', '#ffcf73', '#ffa03b'];

type ShellKind = 'peony' | 'chrysanthemum' | 'willow' | 'ring';

/**
 * Thông số từng kiểu pháo:
 * - speed: tốc độ tia lửa lúc nổ; quả cầu lửa rộng chừng speed / drag
 * - drag: sức cản không khí; gravity: tia lửa rủ xuống (tốc độ rơi tối đa = gravity / drag)
 * - life: thời gian cháy của tia (giây); trail: độ dài vệt đuôi (giây); glitter: 0–1, lấp lánh lúc sắp tắt
 */
interface ShellParams {
  /** Tỉ lệ xuất hiện của kiểu này. */
  weight: number;
  speed: number;
  drag: number;
  gravity: number;
  life: number;
  trail: number;
  glitter: number;
}

const KINDS: Record<ShellKind, ShellParams> = {
  // Cầu tròn, vệt ngắn, có lõi khác màu
  peony: { weight: 0.3, speed: 20, drag: 2.2, gravity: 6, life: 2.3, trail: 0.08, glitter: 0.8 },
  // Cầu tròn, vệt dài như cánh hoa cúc
  chrysanthemum: { weight: 0.3, speed: 22, drag: 2.0, gravity: 6, life: 2.6, trail: 0.32, glitter: 0.5 },
  // Tia vàng rủ xuống thật lâu như cành liễu
  willow: { weight: 0.2, speed: 16, drag: 2.4, gravity: 9, life: 4.0, trail: 0.65, glitter: 0 },
  // Vòng tròn nghiêng về phía camera
  ring: { weight: 0.2, speed: 19, drag: 2.2, gravity: 4, life: 2.1, trail: 0.12, glitter: 0.6 },
};

const pickKind = (): ShellKind => {
  let roll = Math.random();
  for (const kind of Object.keys(KINDS) as ShellKind[]) {
    roll -= KINDS[kind].weight;
    if (roll <= 0) return kind;
  }
  return 'peony';
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uViewportHeight;
  attribute vec4 aLaunch;   // xyz: điểm phóng trên mặt đất, w: thời gian bay lên (giây)
  attribute vec4 aBurst;    // xyz: điểm nổ, w: thời điểm bắn
  attribute vec3 aVelocity; // vận tốc tia lửa lúc nổ
  attribute vec3 aColor;
  attribute vec4 aMotion;   // x: drag, y: gravity, z: life, w: độ dài vệt đuôi (giây)
  attribute float aGlitter;
  attribute vec3 aRole;     // x: vị trí trong vệt (0 = đầu tia, 1 = cuối vệt), y: 1 = vẽ cả đầu pháo bay lên, z: 1 = chớp sáng lúc nổ
  attribute float aRandom;
  varying vec3 vColor;
  varying float vAlpha;

  // Vị trí tia lửa sau khi nổ s giây: chuyển động có lực cản tuyến tính và trọng lực
  vec3 sparkPosition(float s) {
    float k = aMotion.x;
    float travel = (1.0 - exp(-k * s)) / k;
    vec3 p = aBurst.xyz + aVelocity * travel;
    p.y -= aMotion.y / k * (s - travel);
    return p;
  }

  // Đầu pháo bay lên, chậm dần khi gần tới điểm nổ
  vec3 rocketPosition(float t) {
    float k = clamp(t / aLaunch.w, 0.0, 1.0);
    return mix(aLaunch.xyz, aBurst.xyz, 1.0 - (1.0 - k) * (1.0 - k));
  }

  void main() {
    float t = uTime - aBurst.w;
    float rise = aLaunch.w;
    float trail = aRole.x;
    // Các điểm trong vệt đi trễ hơn đầu tia; càng về cuối vệt càng mờ và nhỏ
    float tail = pow(1.0 - trail, 1.6);

    vec3 pos = vec3(0.0);
    float size = 0.0;
    float alpha = 0.0;
    vec3 color = vec3(0.0);
    float maxPixels = uViewportHeight * 0.03;

    float rocketTime = t - trail * 0.1;
    if (aRole.y > 0.5 && rocketTime >= 0.0 && rocketTime < rise) {
      pos = rocketPosition(rocketTime);
      pos.x += sin(rocketTime * 40.0 + trail * 9.0) * 0.06 * trail;
      size = mix(0.45, 0.15, trail);
      alpha = tail * (0.7 + 0.3 * sin(t * 50.0 + aRandom * 20.0));
      color = vec3(2.0, 1.4, 0.7);
    } else if (aRole.z > 0.5) {
      // Chớp sáng to, tắt rất nhanh ngay lúc nổ (Bloom làm nó loá ra xung quanh)
      float s = t - rise;
      if (s >= 0.0 && s < 0.35) {
        pos = aBurst.xyz;
        size = 6.0 * (0.7 + s);
        alpha = exp(-s * 12.0);
        color = aColor * 0.6 + vec3(1.4, 1.3, 1.1);
        maxPixels = uViewportHeight * 0.25;
      }
    } else {
      float s = t - rise - trail * aMotion.w;
      float life = aMotion.z;
      if (s >= 0.0 && s < life) {
        float age = s / life;
        pos = sparkPosition(s);
        size = mix(0.6, 0.22, age) * mix(1.0, 0.6, trail);
        alpha = tail * (1.0 - smoothstep(0.55, 1.0, age));
        // Sắp tắt thì lấp lánh: nhấp nháy ngẫu nhiên theo từng tia
        float blink = step(0.45, fract(s * 13.0 + aRandom * 17.0));
        alpha *= mix(1.0, blink, aGlitter * smoothstep(0.4, 0.6, age));
        // Vừa nổ thì trắng chói, sau đó về màu thật; cuối vệt ngả màu than hồng
        float hot = exp(-s * 4.5);
        color = mix(aColor, vec3(1.0, 0.55, 0.25), trail * 0.6);
        color = color * (1.0 + 2.0 * hot) + vec3(0.7) * hot;
      }
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float depth = max(-mvPosition.z, 0.001);
    float pixels = size * projectionMatrix[1][1] * uViewportHeight * 0.5 / depth;
    gl_PointSize = alpha > 0.002 ? clamp(pixels, 1.0, maxPixels) : 0.0;
    // Điểm không dùng tới thì đưa ra ngoài màn hình
    gl_Position = alpha > 0.002 ? projectionMatrix * mvPosition : vec4(2.0, 2.0, 2.0, 1.0);
    vColor = color;
    vAlpha = clamp(alpha, 0.0, 1.0);
  }
`;

/* Alpha kẹp trong [0, 1] và màu luôn hữu hạn: không sinh pixel Inf/NaN cho Bloom (xem GroundGlitter). */
const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float glow = 1.0 - smoothstep(0.0, 0.5, distance(gl_PointCoord, vec2(0.5)));
    gl_FragColor = vec4(vColor, clamp(glow * glow * vAlpha, 0.0, 1.0));
  }
`;

const createGeometry = () => {
  const geometry = new THREE.BufferGeometry();
  const attribute = (size: number, fill?: (i: number, out: Float32Array) => void) => {
    const array = new Float32Array(COUNT * size);
    if (fill) for (let i = 0; i < COUNT; i++) fill(i, array);
    return new THREE.BufferAttribute(array, size);
  };
  // `position` không dùng trong shader nhưng three cần nó để biết số điểm cần vẽ
  geometry.setAttribute('position', attribute(3));
  // Thời gian bay lên mặc định 1 (shader chia cho nó)
  geometry.setAttribute('aLaunch', attribute(4, (i, a) => (a[i * 4 + 3] = 1)));
  // Thời điểm bắn âm rất xa: mọi ô đều đang "đã tắt"
  geometry.setAttribute('aBurst', attribute(4, (i, a) => (a[i * 4 + 3] = -1e6)));
  geometry.setAttribute('aVelocity', attribute(3));
  geometry.setAttribute('aColor', attribute(3));
  geometry.setAttribute('aMotion', attribute(4, (i, a) => a.set([2, 0, 1, 0], i * 4)));
  geometry.setAttribute('aGlitter', attribute(1));
  geometry.setAttribute('aRandom', attribute(1, (i, a) => (a[i] = Math.random())));
  // Vai trò cố định của từng điểm: vị trí trong vệt, tia số 0 vẽ đầu pháo, điểm đầu của tia số 1 là chớp sáng
  geometry.setAttribute(
    'aRole',
    attribute(3, (i, a) => {
      const spark = Math.floor((i % PER_SHELL) / TRAIL);
      const trail = i % TRAIL;
      a.set([trail / (TRAIL - 1), spark === 0 ? 1 : 0, spark === 1 && trail === 0 ? 1 : 0], i * 3);
    }),
  );
  return geometry;
};

/** Hướng nhìn của camera chiếu xuống mặt phẳng ngang: `forward` từ camera về phía cây, `right` sang phải màn hình. */
interface ViewBasis {
  forward: THREE.Vector3;
  right: THREE.Vector3;
}

const UP = new THREE.Vector3(0, 1, 0);

const getViewBasis = (camera: THREE.Camera): ViewBasis => {
  const forward = camera.getWorldDirection(new THREE.Vector3()).setY(0);
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
  forward.normalize();
  return { forward, right: new THREE.Vector3().crossVectors(forward, UP).normalize() };
};

// Biến tạm dùng lại
const burstPoint = new THREE.Vector3();
const ringAxis = new THREE.Vector3();
const ringU = new THREE.Vector3();
const ringV = new THREE.Vector3();
const velocity = new THREE.Vector3();
const colorA = new THREE.Color();
const colorB = new THREE.Color();
const sparkColor = new THREE.Color();

/** Chọn điểm nổ theo hướng nhìn của camera; `side` = -1 bên trái cây, 1 bên phải. */
const pickBurstPoint = ({ forward, right }: ViewBasis, side: number) => {
  if (Math.random() < ABOVE_TREE.chance) {
    return burstPoint
      .set(0, randomRange(ABOVE_TREE.heightMin, ABOVE_TREE.heightMax), 0)
      .addScaledVector(right, randomRange(-ABOVE_TREE.side, ABOVE_TREE.side))
      .addScaledVector(forward, randomRange(ABOVE_TREE.depthMin, ABOVE_TREE.depthMax));
  }
  return burstPoint
    .set(0, randomRange(BURST_AREA.heightMin, BURST_AREA.heightMax), 0)
    .addScaledVector(right, side * randomRange(BURST_AREA.sideMin, BURST_AREA.sideMax))
    .addScaledVector(forward, randomRange(BURST_AREA.depthMin, BURST_AREA.depthMax));
};

/**
 * Ghi thông số một quả pháo vào ô `slot`, bắn lúc `startTime` (theo đồng hồ của cảnh).
 * Trả về thời điểm quả pháo tắt hẳn (kể cả vệt đuôi).
 */
const writeShell = (
  geometry: THREE.BufferGeometry,
  slot: number,
  startTime: number,
  view: ViewBasis,
  side: number,
  themeGold: string,
) => {
  const burst = pickBurstPoint(view, side);
  const get = (name: string) => geometry.getAttribute(name) as THREE.BufferAttribute;
  const launchAttr = get('aLaunch');
  const burstAttr = get('aBurst');
  const velocityAttr = get('aVelocity');
  const colorAttr = get('aColor');
  const motionAttr = get('aMotion');
  const glitterAttr = get('aGlitter');

  const kind = pickKind();
  const params = KINDS[kind];
  const palette = [...VIVID, themeGold];
  colorA.set(kind === 'willow' ? randomItem(WILLOW_GOLD) : randomItem(palette));
  colorB.set(kind === 'willow' ? randomItem(WILLOW_GOLD) : randomItem(palette));

  // Bay lên gần như thẳng đứng từ mặt đất ngay dưới chỗ nổ
  const launchX = burst.x + randomRange(-2, 2);
  const launchZ = burst.z + randomRange(-2, 2);
  const rise = Math.max(0.6, (burst.y - GROUND_Y) / RISE_SPEED);

  if (kind === 'ring') {
    // Mặt phẳng vòng tròn: nghiêng về phía camera một chút để thấy rõ hình vòng
    ringAxis.copy(view.forward).negate().addScaledVector(velocity.randomDirection(), 0.6).normalize();
    ringU.crossVectors(ringAxis, Math.abs(ringAxis.y) < 0.9 ? UP : view.right).normalize();
    ringV.crossVectors(ringAxis, ringU);
  }
  const speedScale = randomRange(0.9, 1.1);
  let longestLife = 0;

  const first = slot * PER_SHELL;
  for (let spark = 0; spark < SPARKS; spark++) {
    let speed = params.speed * speedScale * randomRange(0.94, 1.04);
    sparkColor.copy(colorA);
    if (kind === 'ring') {
      const angle = (spark / SPARKS) * Math.PI * 2;
      velocity
        .copy(ringU)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(ringV, Math.sin(angle))
        .addScaledVector(ringAxis, randomRange(-0.05, 0.05));
      if (spark % 2 === 1) sparkColor.copy(colorB);
    } else {
      velocity.randomDirection();
      // Mẫu đơn có lõi nhỏ khác màu ở giữa; cúc thì nửa tia màu này nửa tia màu kia
      if (kind === 'peony' && spark % 4 === 0) {
        speed *= 0.45;
        sparkColor.copy(colorB);
      } else if (kind === 'chrysanthemum' && spark % 2 === 1) {
        sparkColor.copy(colorB);
      }
    }
    velocity.multiplyScalar(speed);
    // Mỗi tia cháy lâu ngắn khác nhau một chút, nhưng cả vệt của một tia phải tắt cùng nhịp với đầu tia
    const life = params.life * randomRange(0.85, 1.1);
    longestLife = Math.max(longestLife, life);

    for (let trail = 0; trail < TRAIL; trail++) {
      const i = first + spark * TRAIL + trail;
      launchAttr.setXYZW(i, launchX, GROUND_Y, launchZ, rise);
      burstAttr.setXYZW(i, burst.x, burst.y, burst.z, startTime);
      velocityAttr.setXYZ(i, velocity.x, velocity.y, velocity.z);
      colorAttr.setXYZ(i, sparkColor.r, sparkColor.g, sparkColor.b);
      motionAttr.setXYZW(i, params.drag, params.gravity, life, params.trail);
      glitterAttr.setX(i, params.glitter);
    }
  }

  // Chỉ gửi lên GPU đúng đoạn của ô vừa ghi
  for (const a of [launchAttr, burstAttr, velocityAttr, colorAttr, motionAttr, glitterAttr]) {
    a.addUpdateRange(first * a.itemSize, PER_SHELL * a.itemSize);
    a.needsUpdate = true;
  }
  return startTime + rise + longestLife + params.trail;
};

/** Pháo hoa bắn khi giơ ✌️ (hoặc nhấn F). */
export const Fireworks = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(createGeometry, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uViewportHeight: { value: 1000 } }), []);
  const state = useRef({
    nextSlot: 0,
    nextSide: 1,
    handledRequests: useStore.getState().fireworksRequests,
    /**
     * Quả cuối cùng tắt hẳn lúc nào; sau đó ẩn cả lớp pháo hoa để GPU khỏi xử lý ~23.000 điểm vô ích mỗi khung hình.
     * Giây đầu tiên vẫn vẽ (chưa có quả nào nên không thấy gì) để shader được biên dịch sẵn, lần bắn đầu không bị khựng.
     */
    activeUntil: 1,
  });

  useFrame(({ clock, size, viewport, camera }) => {
    const points = pointsRef.current;
    const live = materialRef.current?.uniforms;
    if (!points || !live) return;
    const now = clock.elapsedTime;
    live.uTime.value = now;
    live.uViewportHeight.value = size.height * viewport.dpr;

    const { fireworksRequests, theme } = useStore.getState();
    const s = state.current;
    if (fireworksRequests !== s.handledRequests) {
      s.handledRequests = fireworksRequests;
      const view = getViewBasis(camera);
      let startTime = now;
      for (let i = 0; i < VOLLEY_SIZE; i++) {
        const endTime = writeShell(geometry, s.nextSlot, startTime, view, s.nextSide, THEMES[theme].gold);
        s.activeUntil = Math.max(s.activeUntil, endTime);
        s.nextSlot = (s.nextSlot + 1) % SLOTS;
        s.nextSide = -s.nextSide;
        startTime += randomRange(VOLLEY_GAP.min, VOLLEY_GAP.max);
      }
    }
    points.visible = now < s.activeUntil;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
