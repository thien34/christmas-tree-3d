import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

interface CameraRigProps {
  autoRotate: boolean;
}

/** Camera chính + điều khiển xoay/zoom bằng chuột. */
export const CameraRig = ({ autoRotate }: CameraRigProps) => (
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
