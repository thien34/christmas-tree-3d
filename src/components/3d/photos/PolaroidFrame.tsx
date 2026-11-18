import { useMemo, type Ref } from 'react';
import * as THREE from 'three';

/** Ảnh vuông 1×1; viền 1.2×1.5 lệch xuống dưới để chừa khoảng trắng phía dưới như ảnh Polaroid. */
const PHOTO_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const BORDER_GEOMETRY = new THREE.PlaneGeometry(1.2, 1.5);
const BORDER_OFFSET: [number, number, number] = [0, -0.15, -0.01];

interface PolaroidFrameProps {
  ref?: Ref<THREE.Group>;
  texture: THREE.Texture;
  borderColor: string;
  rotation?: THREE.Euler;
  scale?: number;
}

/** Một tấm ảnh Polaroid hai mặt: mặt trước có ảnh, mặt sau trơn cùng màu viền. */
export const PolaroidFrame = ({ ref, texture, borderColor, rotation, scale }: PolaroidFrameProps) => {
  const borderMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: borderColor, roughness: 0.9, metalness: 0 }),
    [borderColor],
  );

  return (
    <group ref={ref} rotation={rotation} scale={scale}>
      {/* Mặt trước */}
      <group position={[0, 0, 0.5]}>
        <mesh geometry={PHOTO_GEOMETRY}>
          <meshStandardMaterial map={texture} roughness={0.5} metalness={0} />
        </mesh>
        <mesh geometry={BORDER_GEOMETRY} material={borderMaterial} position={BORDER_OFFSET} />
      </group>

      {/* Mặt sau */}
      <group position={[0, 0, -0.5]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={BORDER_GEOMETRY} material={borderMaterial} position={BORDER_OFFSET} />
      </group>
    </group>
  );
};
