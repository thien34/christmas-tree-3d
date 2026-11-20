import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../../../constants/config';
import { useStore } from '../../../store';
import { randomEuler, randomItem, randomRange, randomRotationSpeed, randomSpread } from '../../../utils/random';
import { sampleHangingSpot, sampleShellPoint } from '../../../utils/treePositions';
import { damping, spin } from '../shared/motion';
import { pickNearestOnScreen } from './pickPhotoOnScreen';
import { PolaroidFrame } from './PolaroidFrame';

const CHAOS_RADIUS = 50;
/** Ảnh treo cách mặt cây chừng này, vừa đủ nằm ngoài lớp quả cầu và hộp quà. */
const CLEARANCE = 1.2;
/** Tốc độ ảnh xoay về tư thế treo khi cây thành hình. */
const TURN_SPEED = 3;
/** Ảnh to nhỏ khác nhau một chút cho tự nhiên, nhưng không chênh nhau quá nhiều. */
const SCALE_RANGE = { min: 1.2, max: 1.55 };

const ZOOM = {
  /** Khoảng cách từ camera tới ảnh đang phóng to. */
  distance: 25,
  scale: 6,
  /** Giới hạn kích thước để ảnh to vẫn nằm gọn trong màn hình. */
  maxSize: 8,
  moveSpeed: 10,
  scaleSpeed: 8,
};

const createPhoto = () => ({
  chaosPos: sampleShellPoint(CHAOS_RADIUS),
  initialRotation: randomEuler(),
  rotationSpeed: randomRotationSpeed(0.5),
  scale: randomRange(SCALE_RANGE.min, SCALE_RANGE.max),
  /** Ảnh "nặng" hơn bay về cây nhanh hơn. */
  weight: randomRange(0.8, 2),
  borderColor: randomItem(CONFIG.colors.photoBorders),
  /** Mỗi ảnh treo hơi lệch một chút cho tự nhiên (rad). */
  roll: randomSpread(0.2),
  swayOffset: Math.random() * 10,
  swaySpeed: randomRange(0.5, 1),
});

// Biến tạm dùng lại mỗi khung hình
const cameraDirection = new THREE.Vector3();
const zoomTarget = new THREE.Vector3();
const cameraQuaternion = new THREE.Quaternion();
const parentQuaternion = new THREE.Quaternion();
const hangingEuler = new THREE.Euler();
const hangingQuaternion = new THREE.Quaternion();

/** Đưa ảnh ra trước mặt camera và xoay song song với màn hình. */
const moveInFrontOfCamera = (frame: THREE.Object3D, camera: THREE.Camera, delta: number) => {
  const parent = frame.parent!;
  camera.getWorldDirection(cameraDirection);
  zoomTarget.copy(camera.position).addScaledVector(cameraDirection, ZOOM.distance);
  parent.worldToLocal(zoomTarget); // ảnh là con của cây đang quay nên phải đổi sang toạ độ cục bộ
  frame.position.lerp(zoomTarget, damping(ZOOM.moveSpeed, delta));

  camera.getWorldQuaternion(cameraQuaternion);
  parent.getWorldQuaternion(parentQuaternion);
  frame.quaternion.copy(parentQuaternion.invert().multiply(cameraQuaternion));
};

interface PhotoOrnamentProps {
  url: string;
  /** Thứ tự thêm ảnh, quyết định chỗ treo trên cây. */
  index: number;
  /** Ảnh đang được phóng to (dùng chung cho mọi ảnh). */
  zoomedRef: RefObject<THREE.Object3D | null>;
}

/** Một tấm ảnh: tự tải texture của mình nên thêm ảnh mới không ảnh hưởng tới các ảnh đã có. */
const PhotoOrnament = ({ url, index, zoomedRef }: PhotoOrnamentProps) => {
  const texture = useTexture(url);
  const photo = useMemo(createPhoto, []);
  const spot = useMemo(() => sampleHangingSpot(index, CLEARANCE), [index]);
  const frameRef = useRef<THREE.Group>(null);

  useFrame(({ clock, camera }, delta) => {
    const frame = frameRef.current;
    if (!frame) return;
    const isFormed = useStore.getState().sceneState === 'FORMED';
    const isZoomed = frame === zoomedRef.current;

    const scale = isZoomed ? Math.min(photo.scale * ZOOM.scale, ZOOM.maxSize) : photo.scale;
    frame.scale.setScalar(THREE.MathUtils.damp(frame.scale.x, scale, ZOOM.scaleSpeed, delta));

    if (isZoomed) {
      moveInFrontOfCamera(frame, camera, delta);
    } else if (isFormed) {
      frame.position.lerp(spot.position, damping(0.8 * photo.weight, delta));
      // Mặt ảnh hướng ra ngoài, ngả theo sườn cây, hơi lệch và đung đưa nhẹ như đang treo
      const t = clock.elapsedTime * photo.swaySpeed + photo.swayOffset;
      hangingEuler.set(-spot.lean + Math.sin(t) * 0.05, spot.facing, photo.roll + Math.cos(t * 0.8) * 0.05, 'YXZ');
      frame.quaternion.slerp(hangingQuaternion.setFromEuler(hangingEuler), damping(TURN_SPEED, delta));
    } else {
      frame.position.lerp(photo.chaosPos, damping(0.5, delta));
      spin(frame.rotation, photo.rotationSpeed, delta);
    }
  });

  return (
    <PolaroidFrame
      ref={frameRef}
      texture={texture}
      borderColor={photo.borderColor}
      position={photo.chaosPos}
      rotation={photo.initialRotation}
      scale={photo.scale}
    />
  );
};

/**
 * Ảnh người dùng thêm vào, treo trên cây như ảnh Polaroid. Mỗi lần chụm tay phóng to một ảnh khác:
 * ảnh gần tay nhất trong số những ảnh chưa xem, xem hết một lượt thì bắt đầu lượt mới.
 */
export const PhotoOrnaments = () => {
  const photoUrls = useStore((s) => s.photoUrls);
  const groupRef = useRef<THREE.Group>(null);
  /** Được chọn một lần lúc bắt đầu chụm tay và giữ nguyên tới khi thả. */
  const zoomedRef = useRef<THREE.Object3D | null>(null);
  /** Các ảnh đã phóng to trong lượt này, theo thứ tự đã xem. */
  const seenRef = useRef(new Set<THREE.Object3D>());

  useFrame(({ camera }) => {
    const { pinch } = useStore.getState();
    const frames = groupRef.current?.children ?? [];
    if (!pinch) zoomedRef.current = null;
    if (!pinch || zoomedRef.current || frames.length === 0) return;

    const seen = seenRef.current;
    if (frames.every((frame) => seen.has(frame))) {
      // Hết lượt: chỉ giữ lại ảnh vừa xem để lần chụm tay kế tiếp không lặp lại đúng ảnh đó
      const last = [...seen].at(-1);
      seen.clear();
      if (last && frames.length > 1) seen.add(last);
    }
    const unseen = frames.filter((frame) => !seen.has(frame));
    zoomedRef.current = pickNearestOnScreen(unseen, camera, pinch);
    if (zoomedRef.current) seen.add(zoomedRef.current);
  });

  return (
    <group ref={groupRef}>
      {photoUrls.map((url, index) => (
        // Suspense riêng từng ảnh: lúc ảnh mới đang tải, các ảnh khác và phần còn lại của cây không bị ẩn đi
        <Suspense key={url} fallback={null}>
          <PhotoOrnament url={url} index={index} zoomedRef={zoomedRef} />
        </Suspense>
      ))}
    </group>
  );
};
