import { useLayoutEffect, useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { Select } from '@react-three/postprocessing';
import * as THREE from 'three';

/** Mọi tấm ảnh cùng một khuôn: phần ảnh vuông 1×1 nằm trước tấm giấy 1.2×1.5, lề dưới dày như ảnh Polaroid. */
const PHOTO_GEOMETRY = new THREE.PlaneGeometry(1, 1);
const PAPER_GEOMETRY = new THREE.PlaneGeometry(1.2, 1.5);
/**
 * Độ sáng (0–1) của ảnh và của giấy viền. Để dưới 1 vì cảnh rất tối, lại có quầng sáng của đèn và quả cầu
 * xung quanh hắt lên, nên ảnh ở đúng độ sáng gốc trông hơi cháy còn giấy trắng thì chói.
 */
const BRIGHTNESS = { photo: 0.92, paper: 0.55 };
const PHOTO_TINT = new THREE.Color().setScalar(BRIGHTNESS.photo);

type PolaroidFrameProps = ThreeElements['group'] & {
  texture: THREE.Texture;
  borderColor: string;
};

/**
 * Một tấm ảnh Polaroid: mặt trước có ảnh, mặt sau trơn cùng màu viền.
 * Dùng vật liệu không chịu ánh sáng của cảnh để ảnh hiện đúng màu gốc, và bọc trong <Select>
 * để hiệu ứng bloom bỏ qua (xem PostEffects), nếu không vùng sáng trong ảnh sẽ bị loá.
 */
export const PolaroidFrame = ({ texture, borderColor, ...groupProps }: PolaroidFrameProps) => {
  const paperColor = useMemo(() => new THREE.Color(borderColor).multiplyScalar(BRIGHTNESS.paper), [borderColor]);

  // Ảnh không vuông thì cắt bớt hai bên (hoặc trên dưới) và lấy phần giữa cho vừa khung, thay vì kéo méo
  useLayoutEffect(() => {
    const { width, height } = texture.image as { width: number; height: number };
    texture.repeat.set(Math.min(1, height / width), Math.min(1, width / height));
    texture.offset.set((1 - texture.repeat.x) / 2, (1 - texture.repeat.y) / 2);
  }, [texture]);

  return (
    <group {...groupProps}>
      <Select enabled>
        <mesh geometry={PHOTO_GEOMETRY} position={[0, 0, 0.01]}>
          <meshBasicMaterial map={texture} color={PHOTO_TINT} toneMapped={false} />
        </mesh>
        {/* Tấm giấy hai mặt: nhìn từ phía sau chính là mặt lưng của ảnh */}
        <mesh geometry={PAPER_GEOMETRY} position={[0, -0.15, 0]}>
          <meshBasicMaterial color={paperColor} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      </Select>
    </group>
  );
};
