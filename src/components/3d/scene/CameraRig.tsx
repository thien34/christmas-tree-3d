import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useStore } from '../../../store';

/** Camera chính + điều khiển xoay/zoom bằng chuột; tự xoay quanh cây khi cây đã thành hình và không phóng to ảnh. */
export const CameraRig = () => {
  const autoRotate = useStore((s) => s.sceneState === 'FORMED' && !s.pinch);
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 15, 45]} fov={50} />
      <OrbitControls
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
