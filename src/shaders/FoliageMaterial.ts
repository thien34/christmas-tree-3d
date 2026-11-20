import { shaderMaterial } from '@react-three/drei';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';
import { THEMES } from '../constants/themes';

/**
 * Material cho các hạt lá cây: mỗi hạt được vẽ thành một lá kim nhỏ, đặc (không trong suốt) nên che được nhau.
 * - `position`: vị trí tán loạn (CHAOS); `aTargetPos`: vị trí trên cây (FORMED) kèm độ sáng của hạt ở thành phần w.
 * - `uProgress` 0 → 1 nội suy giữa hai vị trí (có easing), kèm dao động nhẹ theo `uTime`.
 * - Màu: từ tông tối (lá khuất bên trong, dưới tầng tán khác) tới tông sáng (đầu cành lộ ra ngoài) của `uColor`.
 */
export const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uColor: new THREE.Color(THEMES.christmas.primary),
    /** Chiều dài lá kim, tính theo đơn vị của cảnh. */
    uLeafSize: 0.45,
    /** Chiều cao vùng vẽ tính bằng pixel thật, để lá giữ đúng kích thước trên mọi màn hình. */
    uViewportHeight: 1000,
  },
  /* glsl */ `
    uniform float uTime;
    uniform float uProgress;
    uniform float uLeafSize;
    uniform float uViewportHeight;
    attribute vec4 aTargetPos;
    attribute float aRandom;
    varying float vShade;
    varying float vRandom;

    float cubicInOut(float t) {
      float f = 2.0 * t - 2.0;
      return t < 0.5 ? 4.0 * t * t * t : 0.5 * f * f * f + 1.0;
    }

    void main() {
      vec3 sway = vec3(
        sin(uTime * 1.5 + position.x),
        cos(uTime + position.y),
        sin(uTime * 1.5 + position.z)
      ) * 0.05;

      float t = cubicInOut(uProgress);
      vec3 finalPos = mix(position, aTargetPos.xyz + sway, t);

      vShade = mix(0.6, aTargetPos.w, t);
      vRandom = aRandom;

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      // Lá nhỏ lại khi bay tán loạn để không phủ kín màn hình; đổi từ đơn vị của cảnh sang pixel theo phối cảnh
      float size = uLeafSize * (0.6 + 0.8 * aRandom) * mix(0.5, 1.0, t);
      // Lá bay sát camera sẽ phình thành một mảng tối che cả màn hình trong một khung hình (nháy đen):
      // thu nhỏ dần khi lại gần, bỏ hẳn khi quá sát, và không bao giờ lớn hơn 4% chiều cao màn hình
      float depth = -mvPosition.z;
      size *= smoothstep(1.5, 6.0, depth);
      float pixels = size * projectionMatrix[1][1] * uViewportHeight * 0.5 / max(depth, 0.001);
      gl_PointSize = min(pixels, uViewportHeight * 0.04);
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
      // Thon dần về hai đầu như lá kim thật
      if (abs(along.y) > 0.11 * (1.0 - 1.7 * abs(along.x))) discard;

      vec3 shadow = uColor * 0.06;
      vec3 lit = uColor * 0.9;
      // Lá trong tán tối hẳn đi, chỉ đầu cành mới bắt sáng, nên tán cây có chiều sâu
      vec3 color = mix(shadow, lit, vShade * vShade);
      // Chồi non ở đầu cành ngả vàng hơn một chút
      color += vec3(0.06, 0.08, 0.0) * smoothstep(0.7, 1.0, vShade);
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
