import type { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';

/** Ảnh vuông 1×1 nằm ngay trước tấm viền 1.2×1.5; viền lệch xuống dưới để chừa khoảng trắng như ảnh Polaroid. */
const PHOTO_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const BORDER_GEOMETRY = new THREE.PlaneGeometry(1.2, 1.5);

type PolaroidFrameProps = ThreeElements['group'] & {
  texture: THREE.Texture;
  borderColor: string;
};

/** Một tấm ảnh Polaroid: mặt trước có ảnh, mặt sau trơn cùng màu viền. */
export const PolaroidFrame = ({ texture, borderColor, ...groupProps }: PolaroidFrameProps) => (
  <group {...groupProps}>
    <mesh geometry={PHOTO_GEOMETRY} position={[0, 0, 0.01]}>
      <meshStandardMaterial map={texture} roughness={0.5} />
    </mesh>
    {/* Tấm viền hai mặt: nhìn từ phía sau chính là mặt lưng của ảnh */}
    <mesh geometry={BORDER_GEOMETRY} position={[0, -0.15, 0]}>
      <meshStandardMaterial color={borderColor} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  </group>
);
