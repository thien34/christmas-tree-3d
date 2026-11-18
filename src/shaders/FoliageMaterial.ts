import { shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';
import { THEMES } from '../constants/themes';

/**
 * Material cho các hạt lá cây: mỗi hạt được vẽ thành một lá kim nhỏ, đặc (không trong suốt) nên che được nhau.
 * - `position`: vị trí tán loạn (CHAOS); `aTargetPos`: vị trí trên cây (FORMED) kèm độ sáng của hạt ở thành phần w.
 * - `uProgress` 0 → 1 nội suy giữa hai vị trí (có easing), kèm dao động nhẹ theo `uTime`.
 * - Khi đổi kiểu cây: `uStyleMix` 0 → 1 đưa hạt từ vị trí cũ `aPrevTargetPos` sang `aTargetPos`.
 * - Màu: từ tông tối (lá khuất bên trong, dưới tầng tán khác) tới tông sáng (đầu cành lộ ra ngoài) của `uColor`.
 */
export const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uStyleMix: 1,
    uColor: new THREE.Color(THEMES.christmas.primary),
    /** Chiều dài lá kim, tính theo đơn vị của cảnh. */
    uLeafSize: 0.6,
    /** Chiều cao vùng vẽ tính bằng pixel thật, để lá giữ đúng kích thước trên mọi màn hình. */
    uViewportHeight: 1000,
  },
  /* glsl */ `
    uniform float uTime;
    uniform float uProgress;
    uniform float uStyleMix;
    uniform float uLeafSize;
    uniform float uViewportHeight;
    attribute vec4 aTargetPos;
    attribute vec4 aPrevTargetPos;
    attribute float aRandom;
    varying float vShade;
    varying float vRandom;

    float cubicInOut(float t) {
      return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
    }

    void main() {
      vec3 sway = vec3(
        sin(uTime * 1.5 + position.x),
        cos(uTime + position.y),
        sin(uTime * 1.5 + position.z)
      ) * 0.05;

      float t = cubicInOut(uProgress);
      vec4 onTree = mix(aPrevTargetPos, aTargetPos, uStyleMix);
      vec3 finalPos = mix(position, onTree.xyz + sway, t);

      vShade = mix(0.6, onTree.w, t);
      vRandom = aRandom;

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      // Lá nhỏ lại khi bay tán loạn để không phủ kín màn hình; đổi từ đơn vị của cảnh sang pixel theo phối cảnh
      float size = uLeafSize * (0.6 + 0.8 * aRandom) * mix(0.5, 1.0, t);
      gl_PointSize = size * projectionMatrix[1][1] * uViewportHeight * 0.5 / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  /* glsl */ `
    uniform vec3 uColor;
    varying float vShade;
    varying float vRandom;

    void main() {
      // Mỗi hạt là một lá kim: nét mảnh nằm theo một hướng ngẫu nhiên
      float angle = vRandom * 6.2831853;
      vec2 p = gl_PointCoord - 0.5;
      vec2 along = vec2(p.x * cos(angle) - p.y * sin(angle), p.x * sin(angle) + p.y * cos(angle));
      if (abs(along.y) > 0.1 || abs(along.x) > 0.5) discard;

      vec3 shadow = uColor * 0.16;
      vec3 lit = uColor * 1.2 + vec3(0.03, 0.05, 0.02);
      vec3 color = mix(shadow, lit, vShade);
      color *= 0.75 + 0.5 * fract(vRandom * 7.31); // mỗi lá đậm nhạt khác nhau một chút
      color *= 0.85 + 0.3 * (along.x + 0.5); // sáng dần về phía đầu lá
      gl_FragColor = vec4(color, 1.0);
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
