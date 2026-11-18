import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../../../constants/config';
import { useStore } from '../../../store';
import { randomEuler, randomItem, randomRange, randomRotationSpeed } from '../../../utils/random';
import { jitterXZ, sampleOrnamentPoint, sampleShellPoint } from '../../../utils/treePositions';
import { damping } from '../shared/motion';
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

const createPhotos = (count: number) =>
  Array.from({ length: count }, () => {
    const chaosPos = sampleShellPoint(CHAOS_RADIUS);
    return {
      chaosPos,
      targetPos: jitterXZ(sampleOrnamentPoint('classic', new THREE.Vector3(), EXCLUDE_TOP), 0.5),
      currentPos: chaosPos.clone(),
      initialRotation: randomEuler(),
      rotationSpeed: randomRotationSpeed(0.5),
      baseScale: Math.random() < BIG_PHOTO_CHANCE ? 1.8 : randomRange(0.8, 1.2),
      zoomScale: 1,
      /** Ảnh "nặng" hơn bay về cây nhanh hơn. */
      weight: randomRange(0.8, 2),
      borderColor: randomItem(CONFIG.colors.photoBorders),
      wobbleOffset: Math.random() * 10,
      wobbleSpeed: randomRange(0.5, 1),
    };
  });

type Photo = ReturnType<typeof createPhotos>[number];

// Biến tạm dùng lại mỗi khung hình
const cameraDirection = new THREE.Vector3();
const zoomTarget = new THREE.Vector3();
const cameraQuaternion = new THREE.Quaternion();
const parentQuaternion = new THREE.Quaternion();

/** Đặt ảnh trước mặt camera và xoay song song với màn hình. */
const placeInFrontOfCamera = (frame: THREE.Group, photo: Photo, camera: THREE.Camera, delta: number) => {
  const parent = frame.parent!;
  camera.getWorldDirection(cameraDirection);
  zoomTarget.copy(camera.position).addScaledVector(cameraDirection, ZOOM.distance);
  parent.worldToLocal(zoomTarget); // ảnh là con của cây đang quay nên phải đổi sang toạ độ cục bộ
  photo.currentPos.lerp(zoomTarget, damping(ZOOM.moveSpeed, delta));

  camera.getWorldQuaternion(cameraQuaternion);
  parent.getWorldQuaternion(parentQuaternion);
  frame.quaternion.copy(parentQuaternion.invert().multiply(cameraQuaternion));
};

/** Ảnh người dùng thêm vào, treo trên cây như ảnh Polaroid; chụm tay để phóng to ảnh gần tay nhất. */
export const PhotoOrnaments = () => {
  const photoUrls = useStore((s) => s.photoUrls);
  const textures = useTexture(photoUrls);
  const photos = useMemo(() => createPhotos(textures.length), [textures]);
  const frameRefs = useRef<(THREE.Group | null)[]>([]);
  /** Index ảnh đang phóng to; được chọn một lần lúc bắt đầu chụm tay và giữ nguyên tới khi thả. */
  const zoomedIndexRef = useRef(-1);

  useFrame(({ clock, camera }, delta) => {
    const frames = frameRefs.current.slice(0, photos.length).filter((frame) => frame !== null);
    if (frames.length !== photos.length) return;
    const { sceneState: state, pinch } = useStore.getState();

    if (!pinch) {
      zoomedIndexRef.current = -1;
    } else if (zoomedIndexRef.current < 0) {
      zoomedIndexRef.current = pickNearestOnScreen(frames, camera, pinch);
    }

    photos.forEach((photo, i) => {
      const frame = frames[i];
      const isZoomed = i === zoomedIndexRef.current;

      if (isZoomed) {
        placeInFrontOfCamera(frame, photo, camera, delta);
      } else {
        const isFormed = state === 'FORMED';
        const speed = isFormed ? 0.8 * photo.weight : 0.5;
        photo.currentPos.lerp(isFormed ? photo.targetPos : photo.chaosPos, damping(speed, delta));
      }
      frame.position.copy(photo.currentPos);

      photo.zoomScale = THREE.MathUtils.damp(photo.zoomScale, isZoomed ? ZOOM.scale : 1, ZOOM.scaleSpeed, delta);
      frame.scale.setScalar(Math.min(photo.baseScale * photo.zoomScale, ZOOM.maxSize));

      if (isZoomed) return;
      if (state === 'FORMED') {
        // Quay mặt ảnh ra ngoài thân cây và đung đưa nhẹ
        frame.lookAt(0, frame.position.y, 0);
        frame.rotateY(Math.PI);
        const t = clock.elapsedTime * photo.wobbleSpeed + photo.wobbleOffset;
        frame.rotation.x += Math.sin(t) * 0.05;
        frame.rotation.z += Math.cos(t * 0.8) * 0.05;
      } else {
        frame.rotation.x += photo.rotationSpeed.x * delta;
        frame.rotation.y += photo.rotationSpeed.y * delta;
        frame.rotation.z += photo.rotationSpeed.z * delta;
      }
    });
  });

  return (
    <group>
      {photos.map((photo, i) => (
        <PolaroidFrame
          key={i}
          ref={(frame) => {
            frameRefs.current[i] = frame;
          }}
          texture={textures[i]}
          borderColor={photo.borderColor}
          rotation={photo.initialRotation}
          scale={photo.baseScale}
        />
      ))}
    </group>
  );
};
