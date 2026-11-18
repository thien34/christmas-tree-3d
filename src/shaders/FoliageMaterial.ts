import { shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../constants/config';
import { THEMES } from '../constants/themes';

/**
 * Material cho các hạt lá cây.
 * - `position`: vị trí tán loạn (CHAOS), `aTargetPos`: vị trí trên cây (FORMED).
 * - `uProgress` 0 → 1 nội suy giữa hai vị trí (có easing), kèm dao động nhẹ theo `uTime`.
 * - Màu chuyển dần từ tối ở gốc lên sáng ở ngọn.
 */
export const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uColor: new THREE.Color(THEMES.christmas.primary),
    uTreeHeight: CONFIG.tree.height,
  },
  /* glsl */ `
    uniform float uTime;
    uniform float uProgress;
    uniform float uTreeHeight;
    attribute vec3 aTargetPos;
    attribute float aRandom;
    varying float vMix;
    varying float vHeight;

    float cubicInOut(float t) {
      return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
    }

    void main() {
      vec3 wobble = vec3(
        sin(uTime * 1.5 + position.x),
        cos(uTime + position.y),
        sin(uTime * 1.5 + position.z)
      ) * 0.15;

      float t = cubicInOut(uProgress);
      vec3 finalPos = mix(position, aTargetPos + wobble, t);

      // Chiều cao chuẩn hoá: 0 = gốc, 1 = ngọn
      vHeight = clamp(finalPos.y / uTreeHeight + 0.5, 0.0, 1.0);
      vMix = t;

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_PointSize = (60.0 * (1.0 + aRandom)) / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  /* glsl */ `
    uniform vec3 uColor;
    varying float vMix;
    varying float vHeight;

    void main() {
      // Cắt điểm vuông thành hình tròn
      if (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;

      vec3 gradient = mix(uColor * 0.35, uColor * 1.4, vHeight);
      gl_FragColor = vec4(gradient * mix(0.8, 1.15, vMix), 1.0);
    }
  `,
);

export type FoliageMaterialImpl = InstanceType<typeof FoliageMaterial>;

// Đăng ký để dùng được dưới dạng thẻ JSX <foliageMaterial /> trong cảnh R3F
extend({ FoliageMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    foliageMaterial: ThreeElement<typeof FoliageMaterial>;
  }
}
