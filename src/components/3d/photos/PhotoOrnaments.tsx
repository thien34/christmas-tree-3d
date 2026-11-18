import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../../../constants/config';
import { useStore } from '../../../store';
import { randomEuler, randomItem, randomRange, randomRotationSpeed } from '../../../utils/random';
import { jitterXZ, sampleOrnamentPoint, sampleShellPoint } from '../../../utils/treePositions';
import { damping, spin } from '../shared/motion';
import { pickNearestOnScreen } from './pickPhotoOnScreen';
import { PolaroidFrame } from './PolaroidFrame';

const CHAOS_RADIUS = 50;
/** Không treo ảnh ở 25% phần chóp cây. */
const EXCLUDE_TOP = 0.25;
const BIG_PHOTO_CHANCE = 0.2;

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
  targetPos: jitterXZ(sampleOrnamentPoint('classic', new THREE.Vector3(), EXCLUDE_TOP), 0.5),
  initialRotation: randomEuler(),
  rotationSpeed: randomRotationSpeed(0.5),
  scale: Math.random() < BIG_PHOTO_CHANCE ? 1.8 : randomRange(0.8, 1.2),
  /** Ảnh "nặng" hơn bay về cây nhanh hơn. */
  weight: randomRange(0.8, 2),
  borderColor: randomItem(CONFIG.colors.photoBorders),
  wobbleOffset: Math.random() * 10,
  wobbleSpeed: randomRange(0.5, 1),
});

// Biến tạm dùng lại mỗi khung hình
const cameraDirection = new THREE.Vector3();
const zoomTarget = new THREE.Vector3();
const cameraQuaternion = new THREE.Quaternion();
const parentQuaternion = new THREE.Quaternion();

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
  /** Ảnh đang được phóng to (dùng chung cho mọi ảnh). */
  zoomedRef: RefObject<THREE.Object3D | null>;
}

/** Một tấm ảnh: tự tải texture của mình nên thêm ảnh mới không ảnh hưởng tới các ảnh đã có. */
const PhotoOrnament = ({ url, zoomedRef }: PhotoOrnamentProps) => {
  const texture = useTexture(url);
  const photo = useMemo(createPhoto, []);
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
      frame.position.lerp(photo.targetPos, damping(0.8 * photo.weight, delta));
      // Quay mặt ảnh ra ngoài thân cây và đung đưa nhẹ
      frame.lookAt(0, frame.position.y, 0);
      frame.rotateY(Math.PI);
      const t = clock.elapsedTime * photo.wobbleSpeed + photo.wobbleOffset;
      frame.rotation.x += Math.sin(t) * 0.05;
      frame.rotation.z += Math.cos(t * 0.8) * 0.05;
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

/** Ảnh người dùng thêm vào, treo trên cây như ảnh Polaroid; chụm tay để phóng to ảnh gần tay nhất. */
export const PhotoOrnaments = () => {
  const photoUrls = useStore((s) => s.photoUrls);
  const groupRef = useRef<THREE.Group>(null);
  /** Được chọn một lần lúc bắt đầu chụm tay và giữ nguyên tới khi thả. */
  const zoomedRef = useRef<THREE.Object3D | null>(null);

  useFrame(({ camera }) => {
    const { pinch } = useStore.getState();
    if (!pinch) zoomedRef.current = null;
    else if (groupRef.current) zoomedRef.current ??= pickNearestOnScreen(groupRef.current.children, camera, pinch);
  });

  return (
    <group ref={groupRef}>
      {photoUrls.map((url) => (
        // Suspense riêng từng ảnh: lúc ảnh mới đang tải, các ảnh khác và phần còn lại của cây không bị ẩn đi
        <Suspense key={url} fallback={null}>
          <PhotoOrnament url={url} zoomedRef={zoomedRef} />
        </Suspense>
      ))}
    </group>
  );
};
