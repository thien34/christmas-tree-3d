import { useEffect, useRef, type ComponentRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../../store';
import { burstAge } from '../shared/formation';

/** Vị trí camera quen thuộc sau phần mở đầu. */
const HOME = new THREE.Vector3(0, 15, 45);
/** Mở đầu: camera bắt đầu từ trên cao, xa và lệch sang một bên, rồi lượn vòng xuống HOME. */
const INTRO = { from: new THREE.Spherical(120, 0.35, -1.3), duration: 5 };
/** Lúc cây vừa thành hình, camera tiến lại gần thêm PUSH_IN (tỉ lệ khoảng cách) rồi lùi về, trong PUSH_SECONDS. */
const PUSH_IN = 0.12;
const PUSH_SECONDS = 3.2;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** Hệ số khoảng cách camera theo thời gian kể từ lúc loé sáng: 1 → 1 - PUSH_IN → 1. */
const pushFactor = (age: number) =>
  age < 0 || age > PUSH_SECONDS ? 1 : 1 - PUSH_IN * Math.sin(Math.PI * easeInOut(age / PUSH_SECONDS));

/** Hằng số ở ngoài component: R3F gán lại `position` mỗi lần render lại, mảng mới sẽ kéo camera về chỗ cũ. */
const INTRO_POSITION = new THREE.Vector3().setFromSpherical(INTRO.from).toArray();
const home = new THREE.Spherical().setFromVector3(HOME);
const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();

/**
 * Camera chính + điều khiển xoay/zoom bằng chuột; tự xoay quanh cây khi cây đã thành hình và không phóng to ảnh.
 * - Mở đầu kiểu phim: camera lượn từ trên cao xuống; người dùng chạm vào là dừng ngay, trả quyền điều khiển.
 * - Lúc cây thành hình, camera nhích lại gần rồi lùi về. Áp theo tỉ lệ nên không đè lên mức zoom người dùng chọn.
 */
export const CameraRig = () => {
  const autoRotate = useStore((s) => s.sceneState === 'FORMED' && !s.pinch);
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const rig = useRef({ introStart: -1, introDone: false, lastPush: 1 });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const stopIntro = () => {
      rig.current.introDone = true;
    };
    controls.addEventListener('start', stopIntro);
    return () => controls.removeEventListener('start', stopIntro);
  }, []);

  useFrame(({ camera, clock }) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const r = rig.current;

    if (!r.introDone) {
      if (r.introStart < 0) r.introStart = clock.elapsedTime;
      const t = Math.min(1, (clock.elapsedTime - r.introStart) / INTRO.duration);
      const k = easeInOut(t);
      spherical.set(
        THREE.MathUtils.lerp(INTRO.from.radius, home.radius, k),
        THREE.MathUtils.lerp(INTRO.from.phi, home.phi, k),
        THREE.MathUtils.lerp(INTRO.from.theta, home.theta, k),
      );
      // Ghi đè sau khi OrbitControls cập nhật (nó kẹp khoảng cách ở maxDistance, phần mở đầu thì xa hơn thế)
      camera.position.setFromSpherical(spherical).add(controls.target);
      camera.lookAt(controls.target);
      if (t >= 1) r.introDone = true;
      return;
    }

    const push = pushFactor(burstAge());
    if (push !== r.lastPush) {
      offset.subVectors(camera.position, controls.target).multiplyScalar(push / r.lastPush);
      camera.position.copy(controls.target).add(offset);
      r.lastPush = push;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={INTRO_POSITION} fov={50} far={1000} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={15}
        maxDistance={80}
        rotateSpeed={1.2}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
      />
    </>
  );
};
